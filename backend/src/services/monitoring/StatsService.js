const { models, sequelize } = require('../../models');
const { Op } = require('sequelize');
const ValidationUtils = require('../../utils/ValidationUtils');
const { ErrorHandler } = require('../../utils/ErrorHandler');

/**
 * StatsService
 * Servicio para obtener estadísticas de todas las requests
 */
class StatsService {

    /**
     * Obtiene estadísticas generales del sistema
     */
    async getSystemStats() {
        try {
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

            const stats = {
                total: totalRequests || 0,
                errors: errorRequests || 0,
                successRate: parseFloat(successRate),
                avgResponseTime: avgDuration ? Math.round(avgDuration) : 0,
                requests24h: requests24h || 0,
                errors24h: errors24h || 0,
                requests7d: requests7d || 0,
                slowRequests: slowRequests || 0,
                methodStats: methodStats.reduce((acc, stat) => {
                    acc[stat['method.name']] = parseInt(stat['method.count']) || 0;
                    return acc;
                }, {}),
                lastUpdated: new Date().toISOString()
            };

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getSystemStats')
            };
        }
    }

    /**
     * Obtiene estadísticas de errores por tipo
     */
    async getErrorStats() {
        try {
            const errorStats = await models.Request.findAll({
                attributes: [
                    [sequelize.col('status.code'), 'status_code'],
                    [sequelize.col('status.description'), 'status_description'],
                    [sequelize.fn('COUNT', '*'), 'count'],
                    [sequelize.fn('AVG', sequelize.col('duration')), 'avg_duration']
                ],
                include: [{
                    model: models.Status,
                    as: 'status',
                    where: { code: { [Op.gte]: 400 } },
                    attributes: []
                }],
                group: ['status.code', 'status.description'],
                order: [[sequelize.fn('COUNT', '*'), 'DESC']],
                raw: true
            });

            const processedStats = errorStats.map(stat => ({
                statusCode: parseInt(stat.status_code),
                description: stat.status_description,
                count: parseInt(stat.count),
                avgDuration: stat.avg_duration ? Math.round(stat.avg_duration) : 0
            }));

            return {
                success: true,
                data: processedStats
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getErrorStats')
            };
        }
    }

    /**
     * Obtiene estadísticas de endpoints más utilizados
     */
    async getTopEndpoints(limit = 10) {
        try {
            // Validar limit
            const limitValidation = ValidationUtils.validatePagination(1, limit);
            if (!limitValidation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(limitValidation.errors, 'limit')
                };
            }

            const topEndpoints = await models.Request.findAll({
                attributes: [
                    'path',
                    [sequelize.fn('COUNT', '*'), 'request_count'],
                    [sequelize.fn('AVG', sequelize.col('duration')), 'avg_duration'],
                    [sequelize.fn('COUNT', sequelize.literal("CASE WHEN \"status\".\"code\" >= 400 THEN 1 END")), 'error_count']
                ],
                include: [{
                    model: models.Status,
                    as: 'status',
                    attributes: []
                }],
                group: ['path'],
                order: [[sequelize.fn('COUNT', '*'), 'DESC']],
                limit: parseInt(limitValidation.limit),
                raw: true
            });

            const processedEndpoints = topEndpoints.map(endpoint => ({
                path: endpoint.path,
                requestCount: parseInt(endpoint.request_count),
                avgDuration: endpoint.avg_duration ? Math.round(endpoint.avg_duration) : 0,
                errorCount: parseInt(endpoint.error_count) || 0,
                errorRate: endpoint.request_count > 0 ? 
                    ((endpoint.error_count / endpoint.request_count) * 100).toFixed(2) : 0
            }));

            return {
                success: true,
                data: processedEndpoints
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getTopEndpoints')
            };
        }
    }

    /**
     * Obtiene estadísticas de performance
     */
    async getPerformanceStats() {
        try {
            const performanceStats = await models.Request.findAll({
                attributes: [
                    [sequelize.fn('COUNT', '*'), 'total_requests'],
                    [sequelize.fn('AVG', sequelize.col('duration')), 'avg_response_time'],
                    [sequelize.fn('MIN', sequelize.col('duration')), 'min_response_time'],
                    [sequelize.fn('MAX', sequelize.col('duration')), 'max_response_time'],
                    [sequelize.fn('PERCENTILE_CONT', sequelize.literal('0.5')), 'median_response_time'],
                    [sequelize.fn('PERCENTILE_CONT', sequelize.literal('0.95')), 'p95_response_time'],
                    [sequelize.fn('PERCENTILE_CONT', sequelize.literal('0.99')), 'p99_response_time']
                ],
                where: {
                    duration: { [Op.ne]: null },
                    happened: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                },
                raw: true
            });

            const stats = performanceStats[0] || {};
            
            return {
                success: true,
                data: {
                    totalRequests: parseInt(stats.total_requests) || 0,
                    avgResponseTime: stats.avg_response_time ? Math.round(stats.avg_response_time) : 0,
                    minResponseTime: stats.min_response_time ? Math.round(stats.min_response_time) : 0,
                    maxResponseTime: stats.max_response_time ? Math.round(stats.max_response_time) : 0,
                    medianResponseTime: stats.median_response_time ? Math.round(stats.median_response_time) : 0,
                    p95ResponseTime: stats.p95_response_time ? Math.round(stats.p95_response_time) : 0,
                    p99ResponseTime: stats.p99_response_time ? Math.round(stats.p99_response_time) : 0,
                    period: 'Last 24 hours'
                }
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getPerformanceStats')
            };
        }
    }
}

module.exports = StatsService;