const { models, sequelize } = require('../../models');
const { Op } = require('sequelize');
const ValidationUtils = require('../../utils/ValidationUtils');
const { ErrorHandler } = require('../../utils/ErrorHandler');

/**
 * RequestService
 * Servicio para obtener datos de requests
 */
class RequestService {

    /**
     * Obtiene requests con paginación y filtros
     */
    async getRequests(filters = {}) {
        try {
            // Validar paginación
            const paginationValidation = ValidationUtils.validatePagination(
                filters.page, 
                filters.limit
            );
            
            if (!paginationValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(
                        paginationValidation.errors, 
                        'pagination'
                    )
                };
            }

            // Validar método HTTP si se proporciona
            if (filters.method) {
                const methodValidation = ValidationUtils.validateHttpMethod(filters.method);
                if (!methodValidation.isValid) {
                    return {
                        success: false,
                        error: ErrorHandler.handleValidationError([methodValidation.error], 'method')
                    };
                }
                filters.method = methodValidation.method;
            }

            // Validar código de status si se proporciona
            if (filters.status) {
                const statusValidation = ValidationUtils.validateStatusCode(filters.status);
                if (!statusValidation.isValid) {
                    return {
                        success: false,
                        error: ErrorHandler.handleValidationError([statusValidation.error], 'status')
                    };
                }
                filters.status = statusValidation.statusCode;
            }

            // Validar fechas si se proporcionan
            const dateValidation = ValidationUtils.validateDateFilters(filters.from, filters.to);
            if (!dateValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(dateValidation.errors, 'date filters')
                };
            }

            // Sanitizar búsqueda
            const sanitizedSearch = ValidationUtils.sanitizeSearch(filters.search);

            const { page, limit } = paginationValidation;
            const offset = (page - 1) * limit;
            const where = {};

            // Configurar includes para las relaciones
            const include = [
                {
                    model: models.Status,
                    as: 'status',
                    required: true
                },
                {
                    model: models.Method,
                    as: 'method',
                    required: true
                },
                {
                    model: models.User,
                    as: 'user',
                    required: false
                }
            ];

            // Aplicar filtros validados
            if (filters.method) {
                include.find(inc => inc.as === 'method').where = { name: filters.method };
            }

            if (filters.status) {
                include.find(inc => inc.as === 'status').where = { code: filters.status };
            }

            if (filters.onlyErrors) {
                include.find(inc => inc.as === 'status').where = {
                    code: { [Op.gte]: 400 }
                };
            }

            if (sanitizedSearch) {
                where.path = { [Op.iLike]: `%${sanitizedSearch}%` };
            }

            if (dateValidation.fromDate || dateValidation.toDate) {
                where.happened = {};
                if (dateValidation.fromDate) where.happened[Op.gte] = dateValidation.fromDate;
                if (dateValidation.toDate) where.happened[Op.lte] = dateValidation.toDate;
            }

            const { count, rows } = await models.Request.findAndCountAll({
                where,
                include,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['happened', 'DESC']],
                distinct: true
            });

            return {
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: count,
                    total_pages: Math.ceil(count / limit),
                    has_next: page * limit < count,
                    has_prev: page > 1
                }
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getRequests')
            };
        }
    }

    /**
     * Obtiene detalles completos de una request
     */
    async getRequestDetails(requestId) {
        try {
            // Validar UUID
            if (!ValidationUtils.isValidUUID(requestId)) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(
                        ['Invalid UUID format'], 
                        'requestId'
                    )
                };
            }

            const request = await models.Request.findOne({
                where: { request_id: requestId },
                include: [
                    { model: models.Status, as: 'status' },
                    { model: models.Method, as: 'method' },
                    { model: models.Payload, as: 'payload' },
                    { model: models.Response, as: 'response' },
                    { model: models.User, as: 'user' },
                    { model: models.Exception, as: 'exceptions' },
                    { model: models.Query, as: 'queries' },
                    { 
                        model: models.Header, 
                        as: 'headers',
                        through: { attributes: [] }
                    }
                ]
            });

            if (!request) {
                return {
                    success: false,
                    error: ErrorHandler.handleNotFoundError('Request', requestId)
                };
            }

            return {
                success: true,
                data: request
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getRequestDetails')
            };
        }
    }

    /**
     * Obtiene datos para gráficos de requests por tiempo
     */
    async getRequestsOverTime(period = '24h', interval = '1h') {
        try {
            // Validar período e intervalo
            const timeValidation = ValidationUtils.validateTimePeriod(period, interval);
            if (!timeValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(timeValidation.errors, 'time period')
                };
            }

            let periodHours;
            switch (timeValidation.period) {
                case '24h': periodHours = 24; break;
                case '7d': periodHours = 24 * 7; break;
                case '30d': periodHours = 24 * 30; break;
                default: periodHours = 24;
            }

            const fromDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);

            let dateFormat;
            switch (timeValidation.interval) {
                case '1h':
                    dateFormat = "DATE_TRUNC('hour', happened)";
                    break;
                case '1d':
                    dateFormat = "DATE_TRUNC('day', happened)";
                    break;
                default:
                    dateFormat = "DATE_TRUNC('hour', happened)";
            }

            const data = await models.Request.findAll({
                attributes: [
                    [sequelize.literal(dateFormat), 'time_bucket'],
                    [sequelize.fn('COUNT', '*'), 'request_count'],
                    [sequelize.fn('COUNT', sequelize.literal("CASE WHEN \"status\".\"code\" >= 400 THEN 1 END")), 'error_count']
                ],
                include: [{
                    model: models.Status,
                    as: 'status',
                    attributes: []
                }],
                where: {
                    happened: { [Op.gte]: fromDate }
                },
                group: ['time_bucket'],
                order: [['time_bucket', 'ASC']],
                raw: true
            });

            return {
                success: true,
                data
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getRequestsOverTime')
            };
        }
    }

    /**
     * Obtiene requests con errores
     */
    async getErrorRequests(page = 1, limit = 50) {
        try {
            // Validar paginación
            const paginationValidation = ValidationUtils.validatePagination(page, limit);
            if (!paginationValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(
                        paginationValidation.errors, 
                        'pagination'
                    )
                };
            }

            const { page: validPage, limit: validLimit } = paginationValidation;
            const offset = (validPage - 1) * validLimit;

            const { count, rows } = await models.Request.findAndCountAll({
                include: [{
                    model: models.Status,
                    as: 'status',
                    where: { code: { [Op.gte]: 400 } },
                    required: true
                }, {
                    model: models.Method,
                    as: 'method'
                }],
                limit: parseInt(validLimit),
                offset: parseInt(offset),
                order: [['happened', 'DESC']]
            });

            return {
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(validPage),
                    per_page: parseInt(validLimit),
                    total: count,
                    total_pages: Math.ceil(count / validLimit),
                    has_next: validPage * validLimit < count,
                    has_prev: validPage > 1
                }
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getErrorRequests')
            };
        }
    }

    /**
     * Obtiene requests lentas
     */
    async getSlowRequests(threshold = 1000, limit = 50) {
        try {
            // Validar threshold
            const thresholdValidation = ValidationUtils.validateThreshold(threshold);
            if (!thresholdValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError([thresholdValidation.error], 'threshold')
                };
            }

            // Validar limit
            const limitValidation = ValidationUtils.validatePagination(1, limit);
            if (!limitValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(limitValidation.errors, 'limit')
                };
            }

            const requests = await models.Request.findAll({
                where: { duration: { [Op.gt]: thresholdValidation.threshold } },
                include: [
                    { model: models.Status, as: 'status' },
                    { model: models.Method, as: 'method' }
                ],
                limit: parseInt(limitValidation.limit),
                order: [['duration', 'DESC']]
            });

            return {
                success: true,
                data: requests
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getSlowRequests')
            };
        }
    }
}

module.exports = RequestService;