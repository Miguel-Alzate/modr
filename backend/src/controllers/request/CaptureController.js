const CaptureService = require('../../services/request/CaptureService');
const { ResponseSanitizer } = require('../../utils/ErrorHandler');

/**
 * CaptureController
 * Controlador para capturar y procesar requests HTTP
 */
class CaptureController {
    constructor(io = null) {
        this.service = new CaptureService(io);
    }

    async captureRequest(req, res) {
        try {
            // Extraer y normalizar datos de entrada
            const requestData = {
                method: req.body.method || req.method || 'GET',
                path: req.body.path || req.path || req.originalUrl || '/',
                statusCode: req.body.statusCode || req.body.status_code,
                requestBody: req.body.requestBody || req.body.request_body || req.body.payload,
                responseBody: req.body.responseBody || req.body.response_body || req.body.response,
                headers: req.body.headers || req.headers || {},
                ipAddress: req.body.ipAddress || req.body.ip_address || req.ip || req.connection?.remoteAddress,
                responseTime: req.body.responseTime || req.body.response_time || req.body.duration,
                user_id: req.body.user_id || req.body.userId,
                controller: req.body.controller,
                uuid: req.body.uuid || req.body.request_id,
                error: req.body.error,
                duration: req.body.duration
            };

            // Ejecutar validaciones a través del servicio
            const result = await this.service.captureRequest(requestData);
            
            return ResponseSanitizer.handleControllerResponse(
                res,
                result,
                'Request captured successfully',
                201 // Created status code para recursos creados
            );

        } catch (error) {
            console.error('[MODR] Unexpected error in CaptureController:', error);
            const errorResponse = ResponseSanitizer.error({
                type: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred while capturing request',
                timestamp: new Date().toISOString()
            });
            return res.status(errorResponse.httpCode).json(errorResponse);
        }
    }
}

module.exports = CaptureController;