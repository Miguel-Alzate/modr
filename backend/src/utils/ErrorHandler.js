/**
 * ErrorHandler
 * Maneja y sanitiza errores del sistema MODR
 */
class ErrorHandler {
    
    /**
     * Tipos de errores del sistema
     */
    static ERROR_TYPES = {
        VALIDATION: 'VALIDATION_ERROR',
        NOT_FOUND: 'NOT_FOUND',
        DATABASE: 'DATABASE_ERROR',
        INTERNAL: 'INTERNAL_ERROR',
        TIMEOUT: 'TIMEOUT_ERROR',
        UNAUTHORIZED: 'UNAUTHORIZED_ERROR'
    };

    /**
     * Códigos de estado HTTP correspondientes
     */
    static HTTP_CODES = {
        [this.ERROR_TYPES.VALIDATION]: 400,
        [this.ERROR_TYPES.NOT_FOUND]: 404,
        [this.ERROR_TYPES.DATABASE]: 500,
        [this.ERROR_TYPES.INTERNAL]: 500,
        [this.ERROR_TYPES.TIMEOUT]: 408,
        [this.ERROR_TYPES.UNAUTHORIZED]: 401
    };

    /**
     * Crea un error estructurado
     */
    static createError(type, message, details = null, originalError = null) {
        return {
            type,
            message,
            details,
            timestamp: new Date().toISOString(),
            originalError: originalError ? originalError.message : null
        };
    }

    /**
     * Maneja errores de base de datos
     */
    static handleDatabaseError(error, context = '') {
        console.error(`[MODR] Database Error ${context}:`, error);
        
        // Errores específicos de Sequelize
        if (error.name === 'SequelizeValidationError') {
            return this.createError(
                this.ERROR_TYPES.VALIDATION,
                'Database validation failed',
                error.errors?.map(e => e.message),
                error
            );
        }
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return this.createError(
                this.ERROR_TYPES.VALIDATION,
                'Duplicate entry found',
                error.errors?.map(e => e.message),
                error
            );
        }
        
        if (error.name === 'SequelizeTimeoutError') {
            return this.createError(
                this.ERROR_TYPES.TIMEOUT,
                'Database operation timed out',
                null,
                error
            );
        }
        
        // Error genérico de base de datos
        return this.createError(
            this.ERROR_TYPES.DATABASE,
            'Database operation failed',
            null,
            error
        );
    }

    /**
     * Maneja errores de validación
     */
    static handleValidationError(errors, context = '') {
        console.warn(`[MODR] Validation Error ${context}:`, errors);
        
        return this.createError(
            this.ERROR_TYPES.VALIDATION,
            'Request validation failed',
            Array.isArray(errors) ? errors : [errors]
        );
    }

    /**
     * Maneja errores not found
     */
    static handleNotFoundError(resource, identifier = null) {
        const message = identifier 
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;
            
        return this.createError(
            this.ERROR_TYPES.NOT_FOUND,
            message
        );
    }

    /**
     * Maneja errores internos
     */
    static handleInternalError(error, context = '') {
        console.error(`[MODR] Internal Error ${context}:`, error);
        
        return this.createError(
            this.ERROR_TYPES.INTERNAL,
            'An internal server error occurred',
            null,
            error
        );
    }
}

/**
 * ResponseSanitizer
 * Sanitiza y formatea respuestas del API
 */
class ResponseSanitizer {
    
    /**
     * Formatea respuesta exitosa
     */
    static success(data, message = null) {
        return {
            success: true,
            data,
            message,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Formatea respuesta de error
     */
    static error(error, httpCode = null) {
        const code = httpCode || ErrorHandler.HTTP_CODES[error.type] || 500;
        
        return {
            success: false,
            error: error.type || ErrorHandler.ERROR_TYPES.INTERNAL,
            message: error.message,
            details: error.details || null,
            timestamp: error.timestamp || new Date().toISOString(),
            httpCode: code
        };
    }

    /**
     * Formatea respuesta con paginación
     */
    static paginated(data, pagination, message = null) {
        return {
            success: true,
            data,
            pagination,
            message,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Sanitiza datos sensibles antes de enviar
     */
    static sanitizeOutput(data) {
        if (!data) return data;
        
        // Remover campos sensibles si existen
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'private'];
        
        const sanitize = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(sanitize);
            }
            
            if (obj && typeof obj === 'object') {
                const sanitized = { ...obj };
                
                for (const field of sensitiveFields) {
                    if (sanitized[field]) {
                        sanitized[field] = '[REDACTED]';
                    }
                }
                
                // Recursivo para objetos anidados
                for (const key in sanitized) {
                    if (sanitized[key] && typeof sanitized[key] === 'object') {
                        sanitized[key] = sanitize(sanitized[key]);
                    }
                }
                
                return sanitized;
            }
            
            return obj;
        };
        
        return sanitize(data);
    }

    /**
     * Maneja respuesta del controlador
     */
    static handleControllerResponse(res, result, successMessage = null) {
        try {
            if (result.success === false || result.error) {
                const sanitizedError = this.error(result);
                return res.status(sanitizedError.httpCode).json(sanitizedError);
            }
            
            const sanitizedData = this.sanitizeOutput(result.data || result);
            
            if (result.pagination) {
                return res.json(this.paginated(sanitizedData, result.pagination, successMessage));
            }
            
            return res.json(this.success(sanitizedData, successMessage));
            
        } catch (error) {
            console.error('[MODR] Error in response handler:', error);
            const internalError = ErrorHandler.handleInternalError(error, 'response handling');
            const sanitizedError = this.error(internalError);
            return res.status(sanitizedError.httpCode).json(sanitizedError);
        }
    }
}

module.exports = { ErrorHandler, ResponseSanitizer };