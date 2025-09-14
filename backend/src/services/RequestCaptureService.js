const { models, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * RequestCaptureService
 * Servicio principal para capturar y procesar requests HTTP del sistema MODR
 */
class RequestCaptureService {
    constructor(socketIO = null) {
        this.io = socketIO;
    }

    /**
     * Captura una request HTTP completa
     */
    async captureRequest(requestData) {
        const transaction = await sequelize.transaction();

        try {
            // 1. Obtener o crear método HTTP
            const method = await this.getOrCreateMethod(requestData.method, transaction);
            
            // 2. Obtener o crear status HTTP
            const status = await this.getOrCreateStatus(requestData.statusCode, transaction);
            
            // 3. Crear payload si hay datos
            let payload = null;
            if (requestData.requestBody && Object.keys(requestData.requestBody).length > 0) {
                payload = await this.createPayload(requestData, transaction);
            }

            // 4. Crear response si hay datos
            let response = null;
            if (requestData.responseBody) {
                response = await this.createResponse(requestData, transaction);
            }

            // 5. Crear el request principal
            const request = await this.createMainRequest({
                ...requestData,
                method_id: method.method_id,
                status_id: status.status_id,
                payload_id: payload?.payload_id || null,
                response_id: response?.response_id || null
            }, transaction);

            // 6. Procesar headers
            await this.processHeaders(request.request_id, requestData.headers, transaction);

            // 7. Capturar excepciones si las hay
            if (requestData.error && requestData.error.message) {
                await this.captureException(request.request_id, requestData.error, transaction);
            }

            await transaction.commit();

            // 8. Emitir evento en tiempo real
            this.emitRequestEvent(request, method, status);

            return request;
            
        } catch (error) {
            await transaction.rollback();
            console.error('[MODR] Error capturing request:', error);
            throw error;
        }
    }

    /**
     * Obtiene o crea un método HTTP
     */
    async getOrCreateMethod(methodName, transaction) {
        let method = await models.Method.findOne({ 
            where: { name: methodName },
            transaction 
        });
        
        if (!method) {
            method = await models.Method.create({
                name: methodName,
                description: `HTTP ${methodName} method`
            }, { transaction });
        }
        
        return method;
    }

    /**
     * Obtiene o crea un status HTTP
     */
    async getOrCreateStatus(statusCode, transaction) {
        let status = await models.Status.findOne({ 
            where: { code: statusCode },
            transaction 
        });
        
        if (!status) {
            const statusDescriptions = {
                200: 'OK - Request successful',
                201: 'Created - Resource created successfully',
                400: 'Bad Request - Invalid request',
                401: 'Unauthorized - Authentication required',
                403: 'Forbidden - Access denied',
                404: 'Not Found - Resource not found',
                500: 'Internal Server Error - Server error occurred'
            };

            status = await models.Status.create({
                code: statusCode,
                description: statusDescriptions[statusCode] || `HTTP ${statusCode}`
            }, { transaction });
        }
        
        return status;
    }

    /**
     * Crea un payload para la request
     */
    async createPayload(requestData, transaction) {
        return await models.Payload.create({
            payload_json: requestData.requestBody,
            sent_from: requestData.ipAddress
        }, { transaction });
    }

    /**
     * Crea una response
     */
    async createResponse(requestData, transaction) {
        const responseSize = requestData.responseBody 
            ? Buffer.byteLength(JSON.stringify(requestData.responseBody), 'utf8') / 1024 
            : 0;

        return await models.Response.create({
            content: requestData.responseBody,
            size: responseSize
        }, { transaction });
    }

    /**
     * Crea el request principal
     */
    async createMainRequest(data, transaction) {
        return await models.Request.create({
            request_id: data.uuid || uuidv4(),
            status_id: data.status_id,
            method_id: data.method_id,
            payload_id: data.payload_id,
            response_id: data.response_id,
            path: data.path,
            controller: data.controller || data.path,
            happened: new Date(),
            duration: data.responseTime || data.duration,
            made_by: data.user_id || '10000000-0000-0000-0000-000000000000'
        }, { transaction });
    }

    /**
     * Procesa headers importantes
     */
    async processHeaders(requestId, headers, transaction) {
        if (!headers) return;

        const importantHeaders = [
            'user-agent', 
            'content-type', 
            'accept', 
            'origin', 
            'referer',
            'x-forwarded-for'
        ];

        for (const headerName of importantHeaders) {
            if (headers[headerName]) {
                let header = await models.Header.findOne({ 
                    where: { name: headerName },
                    transaction 
                });
                
                if (!header) {
                    header = await models.Header.create({
                        name: headerName,
                        description: `${headerName} header`
                    }, { transaction });
                }
                
                // Insertar relación en request_headers
                await sequelize.query(
                    'INSERT INTO request_headers (request_id, header_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
                    {
                        replacements: [requestId, header.header_id],
                        transaction
                    }
                );
            }
        }
    }

    /**
     * Captura excepciones
     */
    async captureException(requestId, error, transaction) {
        return await models.Exception.create({
            request_id: requestId,
            message: error.message,
            type: error.type || (error.statusCode >= 500 ? 'system' : 'business'),
            stack_trace: error.stack
        }, { transaction });
    }

    /**
     * Emite eventos en tiempo real
     */
    emitRequestEvent(request, method, status) {
        if (!this.io) return;

        const eventData = {
            id: request.request_id,
            method: method.name,
            path: request.path,
            statusCode: status.code,
            duration: request.duration,
            timestamp: request.happened
        };

        this.io.emit('modr:new_request', eventData);

        if (status.code >= 400) {
            this.io.emit('modr:error_request', eventData);
        }
    }

    /**
     * Captura queries SQL (para usar con hooks de Sequelize)
     */
    async captureQuery(requestId, sql, duration) {
        try {
            await models.Query.create({
                request_id: requestId,
                sql: sql,
                duration: duration
            });
        } catch (error) {
            console.error('[MODR] Error capturing query:', error);
        }
    }
}

module.exports = RequestCaptureService;
