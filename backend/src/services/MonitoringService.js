const { models, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * MonitoringService
 * Servicio para el dashboard de monitoreo del sistema MODR
 */
class MonitoringService {

    /**
     * Obtiene requests con paginación y filtros
     */
    async getRequests(filters = {}) {
        const {
            page = 1,
            limit = 50,
            method,
            status,
            search,
            from,
            to,
            onlyErrors = false
        } = filters;

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

        // Aplicar filtros
        if (method) {
            include.find(inc => inc.as === 'method').where = { name: method };
        }

        if (status) {
            include.find(inc => inc.as === 'status').where = { code: parseInt(status) };
        }

        if (onlyErrors) {
            include.find(inc => inc.as === 'status').where = {
                code: { [Op.gte]: 400 }
            };
        }

        if (search) {
            where.path = { [Op.iLike]: `%${search}%` };
        }

        if (from || to) {
            where.happened = {};
            if (from) where.happened[Op.gte] = new Date(from);
            if (to) where.happened[Op.lte] = new Date(to);
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
            requests: rows,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total: count,
                total_pages: Math.ceil(count / limit),
                has_next: page * limit < count,
                has_prev: page > 1
            }
        };
    }

    /**
     * Obtiene detalles completos de una request
     */
    async getRequestDetails(requestId) {
        return await models.Request.findOne({
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
    }

    /**
     * Obtiene estadísticas generales del sistema
     */
    async getSystemStats() {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalRequests,
            errorRequests,
            requests24h,
            errors24h,
            requests7d,
            slowRequests,
            avgDuration,
            methodStats
        ] = await Promise.all([
            // Total de requests
            models.Request.count(),
            
            // Total de errores
            models.Request.count({
                include: [{
                    model: models.Status,
                    as: 'status',
                    where: { code: { [Op.gte]: 400 } },
                    required: true
                }]
            }),
            
            // Requests últimas 24h
            models.Request.count({
                where: { happened: { [Op.gte]: last24Hours } }
            }),
            
            // Errores últimas 24h
            models.Request.count({
                where: { happened: { [Op.gte]: last24Hours } },
                include: [{
                    model: models.Status,
                    as: 'status',
                    where: { code: { [Op.gte]: 400 } },
                    required: true
                }]
            }),
            
            // Requests últimos 7 días
            models.Request.count({
                where: { happened: { [Op.gte]: last7Days } }
            }),
            
            // Requests lentas (> 1000ms)
            models.Request.count({
                where: { duration: { [Op.gt]: 1000 } }
            }),
            
            // Tiempo promedio de respuesta
            models.Request.aggregate('duration', 'AVG', {
                where: { duration: { [Op.ne]: null } }
            }),
            
            // Estadísticas por método HTTP
            models.Request.findAll({
                attributes: [],
                include: [{
                    model: models.Method,
                    as: 'method',
                    attributes: ['name', [sequelize.fn('COUNT', '*'), 'count']]
                }],
                group: ['method.name'],
                raw: true
            })
        ]);

        const successRate = totalRequests > 0 ? 
            ((totalRequests - errorRequests) / totalRequests * 100).toFixed(2) : 0;

        return {
            total: totalRequests,
            errors: errorRequests,
            successRate,
            avgResponseTime: avgDuration ? Math.round(avgDuration) : 0,
            requests24h,
            errors24h,
            requests7d,
            slowRequests,
            methodStats: methodStats.reduce((acc, stat) => {
                acc[stat['method.name']] = parseInt(stat['method.count']);
                return acc;
            }, {})
        };
    }

    /**
     * Obtiene requests lentas
     */
    async getSlowRequests(threshold = 1000, limit = 50) {
        return await models.Request.findAll({
            where: { duration: { [Op.gt]: threshold } },
            include: [
                { model: models.Status, as: 'status' },
                { model: models.Method, as: 'method' }
            ],
            limit: parseInt(limit),
            order: [['duration', 'DESC']]
        });
    }

    /**
     * Obtiene requests con errores
     */
    async getErrorRequests(page = 1, limit = 50) {
        const offset = (page - 1) * limit;

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
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['happened', 'DESC']]
        });

        return {
            requests: rows,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total: count,
                total_pages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Limpia requests antiguas
     */
    async cleanupOldRequests(days = 7) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const deletedCount = await models.Request.destroy({
            where: {
                happened: { [Op.lt]: cutoffDate }
            }
        });

        return {
            deleted_count: deletedCount,
            cutoff_date: cutoffDate
        };
    }

    /**
     * Obtiene datos para gráficos de requests por tiempo
     */
    async getRequestsOverTime(period = '24h', interval = '1h') {
        let periodHours;
        switch (period) {
            case '24h': periodHours = 24; break;
            case '7d': periodHours = 24 * 7; break;
            case '30d': periodHours = 24 * 30; break;
            default: periodHours = 24;
        }

        const fromDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);

        let dateFormat;
        switch (interval) {
            case '1h':
                dateFormat = "DATE_TRUNC('hour', happened)";
                break;
            case '1d':
                dateFormat = "DATE_TRUNC('day', happened)";
                break;
            default:
                dateFormat = "DATE_TRUNC('hour', happened)";
        }

        return await models.Request.findAll({
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
    }
}

module.exports = MonitoringService;
