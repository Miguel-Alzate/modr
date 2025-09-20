const CaptureController = require('../controllers/request/CaptureController');

/**
 * MonitoringMiddleware
 * Middleware principal para capturar requests HTTP del sistema MODR
 */
class ModrMiddleware {
    constructor(socketIO = null) {
        this.captureController = new CaptureController(socketIO);
        this.options = {
            ignorePaths: [
                // '/modr',           // Dashboard
                // '/api/modr',       // API del dashboard  
                // '/api/v1/docs',    // Swagger docs
                // '/health',         // Health check
                // '/socket.io',      // WebSocket
                // '/public',         // Archivos estáticos
                // '/static',         // Archivos estáticos
                // '/favicon.ico'     // Favicon
            ],
            captureResponseBody: true,
            captureHeaders: true,
            maxBodySize: 100000, // 100KB
            onlyErrors: false,
            captureMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
        };
    }

    /**
     * Configura las opciones del middleware
     */
    configure(options = {}) {
        this.options = { ...this.options, ...options };
        return this;
    }

    /**
     * Middleware principal para capturar requests
     */
    capture() {
        return async (req, res, next) => {
            const startTime = Date.now();
            const requestId = require('uuid').v4();
            
            // Verificar si debe capturar esta request
            if (!this.shouldCapture(req, res)) {
                return next();
            }

            // Capturar el cuerpo original de la respuesta
            const originalJson = res.json;
            const originalSend = res.send;
            let responseBody = null;
            
            res.json = function(body) {
                responseBody = body;
                return originalJson.call(this, body);
            };

            res.send = function(body) {
                if (!responseBody) {
                    responseBody = body;
                }
                return originalSend.call(this, body);
            };

            // Cuando la respuesta termine
            res.on('finish', async () => {
                try {
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    const memoryUsage = this.getMemoryUsage();

                    // Preparar datos de la request
                    const requestData = {
                        uuid: requestId,
                        method: req.method,
                        path: req.path || req.url,
                        controller: req.route?.path || req.path,
                        statusCode: res.statusCode,
                        responseTime: responseTime,
                        memoryUsage: memoryUsage,
                        ipAddress: this.getClientIp(req),
                        userAgent: req.headers['user-agent'],
                        headers: this.sanitizeHeaders(req.headers),
                        requestBody: this.prepareBody(req.body),
                        responseBody: this.options.captureResponseBody ? 
                            this.prepareBody(responseBody) : null,
                        userId: req.user?.user_id || null,
                        error: res.locals.error || null
                    };

                    // Capturar la request usando el servicio
                    await this.captureController.captureRequest(requestData);

                } catch (error) {
                    console.error('[MODR] Error capturing request:', error);
                }
            });

            next();
        };
    }

    /**
     * Middleware para capturar errores
     */
    captureErrors() {
        return (error, req, res, next) => {
            // Guardar error en res.locals para capturarlo después
            res.locals.error = {
                message: error.message,
                stack: error.stack,
                type: error.name || 'Error',
                statusCode: error.statusCode || res.statusCode || 500
            };
            
            next(error);
        };
    }

    /**
     * Verifica si debe capturar esta request
     */
    shouldCapture(req, res) {
        // Verificar bypass flag
        if (req.modrBypass) {
            return false;
        }

        // Verificar método HTTP
        if (!this.options.captureMethods.includes(req.method)) {
            return false;
        }

        // Verificar rutas ignoradas
        const reqPath = (req.originalUrl || req.url || '').toLowerCase();
        const shouldIgnore = this.options.ignorePaths.some(ignorePath => {
            const normalizedIgnorePath = ignorePath.toLowerCase();
            return reqPath === normalizedIgnorePath || 
                   reqPath.startsWith(normalizedIgnorePath + '/') ||
                   reqPath.startsWith(normalizedIgnorePath + '?');
        });

        if (shouldIgnore) {
            return false;
        }

        // Verificar WebSocket requests
        if (req.headers.upgrade === 'websocket' || 
            req.headers['sec-websocket-key'] ||
            req.url?.includes('socket.io')) {
            return false;
        }

        // Si solo captura errores
        if (this.options.onlyErrors && res.statusCode < 400) {
            return false;
        }

        return true;
    }

    /**
     * Obtiene la IP real del cliente
     */
    getClientIp(req) {
        return req.ip || 
               req.connection?.remoteAddress || 
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               'unknown';
    }

    /**
     * Sanitiza headers sensibles
     */
    sanitizeHeaders(headers) {
        if (!this.options.captureHeaders) return {};
        
        const sanitized = { ...headers };
        const excludeHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
        
        excludeHeaders.forEach(header => {
            delete sanitized[header.toLowerCase()];
        });
        
        return sanitized;
    }

    /**
     * Prepara el cuerpo para almacenamiento
     */
    prepareBody(body) {
        if (!body) return null;
        
        // Verificar tamaño
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        if (Buffer.byteLength(bodyStr, 'utf8') > this.options.maxBodySize) {
            return {
                _modr_truncated: true,
                _size: Buffer.byteLength(bodyStr, 'utf8'),
                _preview: bodyStr.substring(0, 500) + '...'
            };
        }

        // Si es string, intentar parsear como JSON
        if (typeof body === 'string') {
            try {
                return JSON.parse(body);
            } catch (e) {
                return body;
            }
        }

        return body;
    }

    /**
     * Obtiene el uso de memoria actual
     */
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100; // MB
    }
}

module.exports = ModrMiddleware;
