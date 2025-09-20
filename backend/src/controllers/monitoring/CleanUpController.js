const CleanUpService = require('../../services/monitoring/CleanUpService');
const { ResponseSanitizer } = require('../../utils/ErrorHandler');

/**
 * CleanUpController
 * Controlador para operaciones de limpieza de datos
 */
class CleanUpController {
    constructor() {
        this.service = new CleanUpService();
    }

    /**
     * DELETE /monitoring/cleanup
     * Limpia requests antiguas
     */
    async cleanupOldRequests(req, res) {
        try {
            const days = req.body?.days || req.query?.days || 7;

            const result = await this.service.cleanupOldRequests(days);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Cleanup operation completed successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in CleanupController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred during cleanup operation',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * GET /monitoring/cleanup/preview
     * Obtiene estadísticas de limpieza sin ejecutar
     */
    async getCleanupPreview(req, res) {
        try {
            const { days = 7 } = req.query;

            const result = await this.service.getCleanupStats(days);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Cleanup preview generated successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in CleanupController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while generating cleanup preview',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * DELETE /monitoring/cleanup/by-status
     * Limpia requests por código de estado específico
     */
    async cleanupByStatus(req, res) {
        try {
            const { statusCode, days = 7 } = req.body || req.query;

            if (!statusCode) {
                const validationError = {
                    type: 'VALIDATION_ERROR',
                    message: 'Status code is required',
                    details: ['statusCode parameter is required for cleanup by status'],
                    timestamp: new Date().toISOString()
                };
                const errorResponse = ResponseSanitizer.error(validationError);
                return res.status(errorResponse.httpCode).json(errorResponse);
            }

            const result = await this.service.cleanupByStatus(statusCode, days);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Status-specific cleanup completed successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in CleanupController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred during status-specific cleanup',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * DELETE /monitoring/cleanup/by-method
     * Limpia requests por método HTTP específico
     */
    async cleanupByMethod(req, res) {
        try {
            const { method, days = 7 } = req.body || req.query;

            if (!method) {
                const validationError = {
                    type: 'VALIDATION_ERROR',
                    message: 'HTTP method is required',
                    details: ['method parameter is required for cleanup by method'],
                    timestamp: new Date().toISOString()
                };
                const errorResponse = ResponseSanitizer.error(validationError);
                return res.status(errorResponse.httpCode).json(errorResponse);
            }

            const result = await this.service.cleanupByMethod(method, days);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Method-specific cleanup completed successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in CleanupController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred during method-specific cleanup',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }
}

module.exports = CleanUpController;