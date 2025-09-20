const RequestsService = require('../../services/monitoring/RequestService');
const { ResponseSanitizer } = require('../../utils/ErrorHandler');

/**
 * RequestsController
 * Controlador para manejar operaciones de requests con manejo de errores
 */
class RequestsController {
    constructor() {
        this.service = new RequestsService();
    }

    /**
     * Obtiene requests con paginación y filtros
     */
    async getRequests(req, res) {
        try {
            const filters = {
                page: req.query.page,
                limit: req.query.limit,
                method: req.query.method,
                status: req.query.status,
                search: req.query.search,
                from: req.query.from,
                to: req.query.to,
                onlyErrors: req.query.onlyErrors === 'true' || req.query.only_errors === 'true'
            };

            const result = await this.service.getRequests(filters);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Requests retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in RequestsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching requests',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * Obtiene detalles completos de una request
     */
    async getRequestDetails(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || id.trim() === '') {
                const validationError = {
                    type: 'VALIDATION_ERROR',
                    message: 'Request ID is required',
                    details: ['ID parameter cannot be empty'],
                    timestamp: new Date().toISOString()
                };
                const errorResponse = ResponseSanitizer.error(validationError);
                return res.status(errorResponse.httpCode).json(errorResponse);
            }

            const result = await this.service.getRequestDetails(id);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Request details retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in RequestsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching request details',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * Obtiene requests con errores
     */
    async getErrorRequests(req, res) {
        try {
            const page = req.query.page;
            const limit = req.query.limit;

            const result = await this.service.getErrorRequests(page, limit);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Error requests retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in RequestsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching error requests',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * Obtiene datos para gráficos de requests por tiempo
     */
    async getRequestsOverTime(req, res) {
        try {
            const { period = '24h', interval = '1h' } = req.query;

            const result = await this.service.getRequestsOverTime(period, interval);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Request time series data retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in RequestsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching request time series data',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * Obtiene requests lentas
     */
    async getSlowRequests(req, res) {
        try {
            const { threshold = 1000, limit = 50 } = req.query;

            const result = await this.service.getSlowRequests(threshold, limit);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Slow requests retrieved successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in RequestsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while fetching slow requests',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }

    /**
     * Elimina una request específica y todos sus datos asociados
     */
    async deleteRequest(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || id.trim() === '') {
                const validationError = {
                    type: 'VALIDATION_ERROR',
                    message: 'Request ID is required',
                    details: ['ID parameter cannot be empty'],
                    timestamp: new Date().toISOString()
                };
                const errorResponse = ResponseSanitizer.error(validationError);
                return res.status(errorResponse.httpCode).json(errorResponse);
            }

            const result = await this.service.deleteRequest(id);
            
            return ResponseSanitizer.handleControllerResponse(
                res, 
                result, 
                'Request deleted successfully'
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in RequestsController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while deleting the request',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }
}

module.exports = RequestsController;