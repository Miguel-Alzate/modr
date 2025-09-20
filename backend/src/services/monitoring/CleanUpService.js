const { models, sequelize } = require('../../models');
const { Op } = require('sequelize');
const ValidationUtils = require('../../utils/ValidationUtils');
const { ErrorHandler } = require('../../utils/ErrorHandler');

/**
 * CleanUpService
 * Servicio para eliminar requests (como metodo de limpieza)
 */
class CleanUpService {

    /**
     * Limpia requests antiguas con validación
     */
    async cleanupOldRequests(days = 7) {
        try {
            // Validar días
            const daysValidation = ValidationUtils.validateCleanupDays(days);
            if (!daysValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError([daysValidation.error], 'days parameter')
                };
            }

            const validDays = daysValidation.days;
            const cutoffDate = new Date(Date.now() - validDays * 24 * 60 * 60 * 1000);

            // Verificar que la fecha de corte sea válida
            if (cutoffDate > new Date()) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(
                        ['Cutoff date cannot be in the future'], 
                        'cutoff date calculation'
                    )
                };
            }

            // Primero contar cuántos registros se van a eliminar
            const countToDelete = await models.Request.count({
                where: {
                    happened: { [Op.lt]: cutoffDate }
                }
            });

            if (countToDelete === 0) {
                return {
                    success: true,
                    data: {
                        deleted_count: 0,
                        cutoff_date: cutoffDate.toISOString(),
                        days_cleaned: validDays,
                        message: 'No requests found matching cleanup criteria'
                    }
                };
            }

            // Realizar la eliminación
            const deletedCount = await models.Request.destroy({
                where: {
                    happened: { [Op.lt]: cutoffDate }
                }
            });

            return {
                success: true,
                data: {
                    deleted_count: deletedCount,
                    cutoff_date: cutoffDate.toISOString(),
                    days_cleaned: validDays,
                    cleanup_completed_at: new Date().toISOString(),
                    message: `Successfully cleaned ${deletedCount} requests older than ${validDays} days`
                }
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'cleanupOldRequests')
            };
        }
    }

    /**
     * Limpia requests por estado específico
     */
    async cleanupByStatus(statusCode, days = 7) {
        try {
            // Validar días
            const daysValidation = ValidationUtils.validateCleanupDays(days);
            if (!daysValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError([daysValidation.error], 'days parameter')
                };
            }

            // Validar código de estado
            const statusValidation = ValidationUtils.validateStatusCode(statusCode);
            if (!statusValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError([statusValidation.error], 'status code')
                };
            }

            const validDays = daysValidation.days;
            const validStatusCode = statusValidation.statusCode;
            const cutoffDate = new Date(Date.now() - validDays * 24 * 60 * 60 * 1000);

            // Contar registros a eliminar
            const countToDelete = await models.Request.count({
                where: {
                    happened: { [Op.lt]: cutoffDate }
                },
                include: [{
                    model: models.Status,
                    as: 'status',
                    where: { code: validStatusCode },
                    required: true
                }]
            });

            if (countToDelete === 0) {
                return {
                    success: true,
                    data: {
                        deleted_count: 0,
                        cutoff_date: cutoffDate.toISOString(),
                        status_code: validStatusCode,
                        days_cleaned: validDays,
                        message: `No requests found with status ${validStatusCode} older than ${validDays} days`
                    }
                };
            }

            // Realizar eliminación por status
            const deletedCount = await models.Request.destroy({
                where: {
                    happened: { [Op.lt]: cutoffDate }
                },
                include: [{
                    model: models.Status,
                    as: 'status',
                    where: { code: validStatusCode },
                    required: true
                }]
            });

            return {
                success: true,
                data: {
                    deleted_count: deletedCount,
                    cutoff_date: cutoffDate.toISOString(),
                    status_code: validStatusCode,
                    days_cleaned: validDays,
                    cleanup_completed_at: new Date().toISOString(),
                    message: `Successfully cleaned ${deletedCount} requests with status ${validStatusCode} older than ${validDays} days`
                }
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'cleanupByStatus')
            };
        }
    }

    /**
     * Obtiene estadísticas de limpieza sin ejecutar
     */
    async getCleanupStats(days = 7) {
        try {
            // Validar días
            const daysValidation = ValidationUtils.validateCleanupDays(days);
            if (!daysValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError([daysValidation.error], 'days parameter')
                };
            }

            const validDays = daysValidation.days;
            const cutoffDate = new Date(Date.now() - validDays * 24 * 60 * 60 * 1000);

            const [
                totalOldRequests,
                oldErrorRequests,
                oldSuccessRequests,
                oldestRequest,
                totalRequests
            ] = await Promise.all([
                // Total de requests antigas
                models.Request.count({
                    where: { happened: { [Op.lt]: cutoffDate } }
                }),

                // Requests antigas con errores
                models.Request.count({
                    where: { happened: { [Op.lt]: cutoffDate } },
                    include: [{
                        model: models.Status,
                        as: 'status',
                        where: { code: { [Op.gte]: 400 } },
                        required: true
                    }]
                }),

                // Requests antigas exitosas
                models.Request.count({
                    where: { happened: { [Op.lt]: cutoffDate } },
                    include: [{
                        model: models.Status,
                        as: 'status',
                        where: { code: { [Op.lt]: 400 } },
                        required: true
                    }]
                }),

                // Request más antigua
                models.Request.findOne({
                    attributes: ['happened'],
                    order: [['happened', 'ASC']],
                    limit: 1
                }),

                // Total de requests en el sistema
                models.Request.count()
            ]);

            const cleanupPercentage = totalRequests > 0 ? 
                ((totalOldRequests / totalRequests) * 100).toFixed(2) : 0;

            return {
                success: true,
                data: {
                    days_to_clean: validDays,
                    cutoff_date: cutoffDate.toISOString(),
                    requests_to_delete: totalOldRequests,
                    error_requests_to_delete: oldErrorRequests,
                    success_requests_to_delete: oldSuccessRequests,
                    total_requests_in_system: totalRequests,
                    cleanup_percentage: parseFloat(cleanupPercentage),
                    oldest_request: oldestRequest?.happened?.toISOString() || null,
                    estimated_space_freed: `${(totalOldRequests * 0.5).toFixed(2)} KB`, // Estimación
                    preview_mode: true
                }
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getCleanupStats')
            };
        }
    }

    /**
     * Limpia requests específicas por método HTTP
     */
    async cleanupByMethod(method, days = 7) {
        try {
            // Validar días
            const daysValidation = ValidationUtils.validateCleanupDays(days);
            if (!daysValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError([daysValidation.error], 'days parameter')
                };
            }

            // Validar método HTTP
            const methodValidation = ValidationUtils.validateHttpMethod(method);
            if (!methodValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError([methodValidation.error], 'HTTP method')
                };
            }

            const validDays = daysValidation.days;
            const validMethod = methodValidation.method;
            const cutoffDate = new Date(Date.now() - validDays * 24 * 60 * 60 * 1000);

            // Contar registros a eliminar
            const countToDelete = await models.Request.count({
                where: {
                    happened: { [Op.lt]: cutoffDate }
                },
                include: [{
                    model: models.Method,
                    as: 'method',
                    where: { name: validMethod },
                    required: true
                }]
            });

            if (countToDelete === 0) {
                return {
                    success: true,
                    data: {
                        deleted_count: 0,
                        cutoff_date: cutoffDate.toISOString(),
                        method: validMethod,
                        days_cleaned: validDays,
                        message: `No ${validMethod} requests found older than ${validDays} days`
                    }
                };
            }

            // Realizar eliminación por método
            const deletedCount = await models.Request.destroy({
                where: {
                    happened: { [Op.lt]: cutoffDate }
                },
                include: [{
                    model: models.Method,
                    as: 'method',
                    where: { name: validMethod },
                    required: true
                }]
            });

            return {
                success: true,
                data: {
                    deleted_count: deletedCount,
                    cutoff_date: cutoffDate.toISOString(),
                    method: validMethod,
                    days_cleaned: validDays,
                    cleanup_completed_at: new Date().toISOString(),
                    message: `Successfully cleaned ${deletedCount} ${validMethod} requests older than ${validDays} days`
                }
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'cleanupByMethod')
            };
        }
    }
}

module.exports = CleanUpService;