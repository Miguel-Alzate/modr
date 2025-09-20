const { models, sequelize } = require('../../models');
const { v4: uuidv4 } = require('uuid');
const ValidationUtils = require('../../utils/ValidationUtils');
const { ErrorHandler } = require('../../utils/ErrorHandler');

/**
 * RequestCaptureService
 * Servicio principal para capturar y procesar requests HTTP del sistema MODR
 */
class RequestCaptureService {
    constructor(socketIO = null) {
        this.io = socketIO;
    }

    /**
     * Captura una request HTTP completa con validaciones
     */
    async captureRequest(requestData) {
        try {
            // 1. Validar datos de entrada
            const validation = this.validateRequestData(requestData);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(validation.errors, 'request capture data')
                };
            }

            // 2. Sanitizar y normalizar datos
            const sanitizedData = this.sanitizeRequestData(validation.data);

            // 3. Ejecutar captura con transacción
            const result = await this.executeCapture(sanitizedData);

            return {
                success: true,
                data: result
            };

        } catch (error) {
            console.error('[MODR] Error in captureRequest:', error);
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'captureRequest')
            };
        }
    }

    /**
     * Valida los datos de la request
     */
    validateRequestData(data) {
        const errors = [];
        const validatedData = {};

        // Validar método HTTP
        if (!data.method || typeof data.method !== 'string') {
            errors.push('method is required and must be a string');
        } else {
            const methodValidation = ValidationUtils.validateHttpMethod(data.method);
            if (!methodValidation.isValid) {
                errors.push(methodValidation.error);
            } else {
                validatedData.method = methodValidation.method;
            }
        }

        // Validar path
        if (!data.path || typeof data.path !== 'string') {
            errors.push('path is required and must be a string');
        } else if (data.path.length > 2000) {
            errors.push('path cannot exceed 2000 characters');
        } else {
            validatedData.path = data.path.trim();
        }

        // Validar status code
        if (data.statusCode !== undefined) {
            const statusValidation = ValidationUtils.validateStatusCode(data.statusCode);
            if (!statusValidation.isValid) {
                errors.push(statusValidation.error);
            } else {
                validatedData.statusCode = statusValidation.statusCode;
            }
        } else {
            validatedData.statusCode = 200; // Default
        }

        // Validar UUID si se proporciona
        if (data.uuid && !ValidationUtils.isValidUUID(data.uuid)) {
            errors.push('uuid must be a valid UUID format');
        } else {
            validatedData.uuid = data.uuid || uuidv4();
        }

        // Validar user_id si se proporciona
        if (data.user_id && !ValidationUtils.isValidUUID(data.user_id)) {
            errors.push('user_id must be a valid UUID format');
        } else {
            validatedData.user_id = data.user_id || '10000000-0000-0000-0000-000000000000';
        }

        // Validar duration/responseTime
        if (data.responseTime !== undefined || data.duration !== undefined) {
            const duration = data.responseTime || data.duration;
            if (typeof duration !== 'number' || duration < 0 || duration > 300000) { // Max 5 minutes
                errors.push('duration must be a non-negative number less than 300000ms');
            } else {
                validatedData.duration = Math.round(duration);
            }
        } else {
            validatedData.duration = 0;
        }

        // Validar IP address
        if (data.ipAddress && !ValidationUtils.isValidIPAddress(data.ipAddress)) {
            errors.push('ipAddress must be a valid IP address');
        } else {
            validatedData.ipAddress = data.ipAddress || '127.0.0.1';
        }

        // Validar controller
        if (data.controller && typeof data.controller !== 'string') {
            errors.push('controller must be a string');
        } else {
            validatedData.controller = data.controller || validatedData.path;
        }

        // Validar request body
        if (data.requestBody !== undefined) {
            try {
                if (typeof data.requestBody === 'string') {
                    JSON.parse(data.requestBody);
                }
                validatedData.requestBody = data.requestBody;
            } catch (e) {
                errors.push('requestBody must be valid JSON if provided as string');
            }
        }

        // Validar response body
        if (data.responseBody !== undefined) {
            try {
                if (typeof data.responseBody === 'string') {
                    JSON.parse(data.responseBody);
                }
                validatedData.responseBody = data.responseBody;
            } catch (e) {
                errors.push('responseBody must be valid JSON if provided as string');
            }
        }

        // Validar headers
        if (data.headers && typeof data.headers !== 'object') {
            errors.push('headers must be an object');
        } else {
            validatedData.headers = data.headers || {};
        }

        // Validar error object
        if (data.error) {
            if (typeof data.error !== 'object') {
                errors.push('error must be an object');
            } else {
                validatedData.error = data.error;
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            data: validatedData
        };
    }

    /**
     * Sanitiza los datos de la request
     */
    sanitizeRequestData(data) {
        return {
            ...data,
            path: ValidationUtils.sanitizeInput(data.path),
            controller: ValidationUtils.sanitizeInput(data.controller),
            headers: this.sanitizeHeaders(data.headers),
            requestBody: this.sanitizeJsonData(data.requestBody),
            responseBody: this.sanitizeJsonData(data.responseBody)
        };
    }

    /**
     * Sanitiza headers
     */
    sanitizeHeaders(headers) {
        if (!headers || typeof headers !== 'object') return {};
        
        const sanitized = {};
        Object.keys(headers).forEach(key => {
            if (typeof key === 'string' && typeof headers[key] === 'string') {
                sanitized[key.toLowerCase()] = ValidationUtils.sanitizeInput(headers[key]);
            }
        });
        
        return sanitized;
    }

    /**
     * Sanitiza datos JSON
     */
    sanitizeJsonData(data) {
        if (!data) return null;
        
        try {
            // Limitar tamaño del payload/response
            const jsonString = JSON.stringify(data);
            if (jsonString.length > 100000) { // 100KB limit
                return { _truncated: true, _originalSize: jsonString.length };
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    /**
     * Ejecuta la captura con transacción
     */
    async executeCapture(data) {
        const transaction = await sequelize.transaction();

        try {
            // 1. Obtener o crear método HTTP
            const method = await this.getOrCreateMethod(data.method, transaction);
            
            // 2. Obtener o crear status HTTP
            const status = await this.getOrCreateStatus(data.statusCode, transaction);
            
            // 3. Crear payload si hay datos
            let payload = null;
            if (data.requestBody && Object.keys(data.requestBody).length > 0) {
                payload = await this.createPayload(data, transaction);
            }

            // 4. Crear response si hay datos
            let response = null;
            if (data.responseBody) {
                response = await this.createResponse(data, transaction);
            }

            // 5. Crear el request principal
            const request = await this.createMainRequest({
                ...data,
                method_id: method.method_id,
                status_id: status.status_id,
                payload_id: payload?.payload_id || null,
                response_id: response?.response_id || null
            }, transaction);

            // 6. Procesar headers
            await this.processHeaders(request.request_id, data.headers, transaction);

            // 7. Capturar excepciones si las hay
            if (data.error && data.error.message) {
                await this.captureException(request.request_id, data.error, transaction);
            }

            await transaction.commit();

            // 8. Emitir evento en tiempo real
            this.emitRequestEvent(request, method, status);

            return request;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Captura una query SQL con validaciones
     */
    async captureQuery(queryData) {
        try {
            // Validar datos de entrada
            const validation = this.validateQueryData(queryData);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(validation.errors, 'query capture data')
                };
            }

            const { requestId, sql, duration, type, bindings } = validation.data;

            // Verificar que el request existe
            const request = await models.Request.findByPk(requestId);
            if (!request) {
                return {
                    success: false,
                    error: ErrorHandler.handleNotFoundError('Request', requestId)
                };
            }

            // Crear la query
            const query = await models.Query.create({
                request_id: requestId,
                sql: sql,
                duration: duration,
                type: type,
                bindings: bindings
            });

            return {
                success: true,
                data: query
            };

        } catch (error) {
            console.error('[MODR] Error in captureQuery:', error);
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'captureQuery')
            };
        }
    }

    /**
     * Valida datos de query
     */
    validateQueryData(data) {
        const errors = [];
        const validatedData = {};

        // Validar requestId
        if (!data.requestId || !ValidationUtils.isValidUUID(data.requestId)) {
            errors.push('requestId is required and must be a valid UUID');
        } else {
            validatedData.requestId = data.requestId;
        }

        // Validar SQL
        if (!data.sql || typeof data.sql !== 'string') {
            errors.push('sql is required and must be a string');
        } else if (data.sql.trim().length === 0) {
            errors.push('sql cannot be empty');
        } else if (data.sql.length > 50000) { // 50KB limit
            errors.push('sql query is too long (max 50,000 characters)');
        } else {
            validatedData.sql = data.sql.trim();
        }

        // Validar duration
        if (data.duration !== undefined) {
            const duration = parseInt(data.duration);
            if (isNaN(duration) || duration < 0) {
                errors.push('duration must be a non-negative integer');
            } else {
                validatedData.duration = duration;
            }
        } else {
            validatedData.duration = 0;
        }

        // Validar type
        if (data.type && typeof data.type !== 'string') {
            errors.push('type must be a string');
        } else {
            validatedData.type = data.type || 'query';
        }

        // Validar bindings
        if (data.bindings) {
            try {
                if (typeof data.bindings === 'string') {
                    JSON.parse(data.bindings);
                }
                validatedData.bindings = data.bindings;
            } catch (e) {
                errors.push('bindings must be valid JSON if provided');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            data: validatedData
        };
    }

    /**
     * Captura una excepción con validaciones
     */
    async captureException(exceptionData) {
        try {
            // Validar datos de entrada
            const validation = this.validateExceptionData(exceptionData);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: ErrorHandler.handleValidationError(validation.errors, 'exception capture data')
                };
            }

            const { requestId, message, type, stackTrace, file, line, code } = validation.data;

            // Verificar que el request existe
            const request = await models.Request.findByPk(requestId);
            if (!request) {
                return {
                    success: false,
                    error: ErrorHandler.handleNotFoundError('Request', requestId)
                };
            }

            // Crear la excepción
            const exception = await models.Exception.create({
                request_id: requestId,
                message: message,
                type: type,
                stack_trace: stackTrace,
                file: file,
                line: line,
                code: code
            });

            return {
                success: true,
                data: exception
            };

        } catch (error) {
            console.error('[MODR] Error in captureException:', error);
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'captureException')
            };
        }
    }

    /**
     * Valida datos de excepción
     */
    validateExceptionData(data) {
        const errors = [];
        const validatedData = {};

        // Validar requestId
        if (!data.requestId || !ValidationUtils.isValidUUID(data.requestId)) {
            errors.push('requestId is required and must be a valid UUID');
        } else {
            validatedData.requestId = data.requestId;
        }

        // Validar message
        if (!data.message || typeof data.message !== 'string') {
            errors.push('message is required and must be a string');
        } else if (data.message.length > 2000) {
            errors.push('message cannot exceed 2000 characters');
        } else {
            validatedData.message = data.message.trim();
        }

        // Validar type
        const validTypes = ['system', 'business', 'validation', 'authentication', 'authorization'];
        if (data.type && !validTypes.includes(data.type)) {
            errors.push(`type must be one of: ${validTypes.join(', ')}`);
        } else {
            validatedData.type = data.type || 'system';
        }

        // Validar stack trace
        if (data.stackTrace && typeof data.stackTrace !== 'string') {
            errors.push('stackTrace must be a string');
        } else {
            validatedData.stackTrace = data.stackTrace;
        }

        // Validar file
        if (data.file && typeof data.file !== 'string') {
            errors.push('file must be a string');
        } else {
            validatedData.file = data.file;
        }

        // Validar line
        if (data.line !== undefined) {
            const line = parseInt(data.line);
            if (isNaN(line) || line < 0) {
                errors.push('line must be a non-negative integer');
            } else {
                validatedData.line = line;
            }
        }

        // Validar code
        if (data.code && typeof data.code !== 'string') {
            errors.push('code must be a string');
        } else {
            validatedData.code = data.code;
        }

        return {
            isValid: errors.length === 0,
            errors,
            data: validatedData
        };
    }

    /**
     * Obtiene estadísticas de captura
     */
    async getCaptureStats() {
        try {
            const stats = await models.Request.findOne({
                attributes: [
                    [sequelize.fn('COUNT', '*'), 'total_requests'],
                    [sequelize.fn('COUNT', sequelize.literal("CASE WHEN happened >= NOW() - INTERVAL '24 hours' THEN 1 END")), 'requests_24h'],
                    [sequelize.fn('COUNT', sequelize.literal("CASE WHEN happened >= NOW() - INTERVAL '1 hour' THEN 1 END")), 'requests_1h'],
                    [sequelize.fn('AVG', sequelize.col('duration')), 'avg_duration'],
                    [sequelize.fn('MAX', sequelize.col('happened')), 'last_request']
                ],
                raw: true
            });

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            return {
                success: false,
                error: ErrorHandler.handleDatabaseError(error, 'getCaptureStats')
            };
        }
    }

    // Métodos privados existentes (getOrCreateMethod, getOrCreateStatus, etc.)
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

    async createPayload(requestData, transaction) {
        return await models.Payload.create({
            payload_json: requestData.requestBody,
            sent_from: requestData.ipAddress
        }, { transaction });
    }

    async createResponse(requestData, transaction) {
        const responseSize = requestData.responseBody 
            ? Buffer.byteLength(JSON.stringify(requestData.responseBody), 'utf8') / 1024 
            : 0;

        return await models.Response.create({
            content: requestData.responseBody,
            size: responseSize
        }, { transaction });
    }

    async createMainRequest(data, transaction) {
        return await models.Request.create({
            request_id: data.uuid,
            status_id: data.status_id,
            method_id: data.method_id,
            payload_id: data.payload_id,
            response_id: data.response_id,
            path: data.path,
            controller: data.controller,
            happened: new Date(),
            duration: data.duration,
            made_by: data.user_id
        }, { transaction });
    }

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
}

module.exports = RequestCaptureService;