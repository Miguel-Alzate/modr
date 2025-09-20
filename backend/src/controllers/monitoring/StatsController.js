const StatsService = require('../../services/monitoring/StatsService');
const { ResponseSanitizer } = require('../../utils/ErrorHandler');

/**
 * StatsController
 * Controlador mejorado para manejar estadísticas y métricas del sistema
 */
class StatsController {
    constructor() {
        this.service = new StatsService();
    }

    /**
     * GET /monitoring/stats
     * Obtiene estadísticas generales del sistema
     */
    async getSystemStats(req, res) {
        try {
            const result = await this.service.getSystemStats();
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'System statistics retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in StatsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching system statistics',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * GET /monitoring/error-stats
     * Obtiene estadísticas de errores por tipo
     */
    async getErrorStats(req, res) {
        try {
            const result = await this.service.getErrorStats();
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Error statistics retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in StatsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching error statistics',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * GET /monitoring/top-endpoints
     * Obtiene endpoints más utilizados
     */
    async getTopEndpoints(req, res) {
        try {
            const { limit = 10 } = req.query;

            const result = await this.service.getTopEndpoints(limit);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Top endpoints retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in StatsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching top endpoints',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * GET /monitoring/performance-stats
     * Obtiene estadísticas de performance
     */
    async getPerformanceStats(req, res) {
        try {
            const result = await this.service.getPerformanceStats();
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Performance statistics retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in StatsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching performance statistics',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }
}

module.exports = StatsController;