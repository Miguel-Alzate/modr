const { Op } = require('sequelize');

/**
 * ValidationUtils
 * Utilidades para validación de datos y parámetros
 */
class ValidationUtils {
    
    /**
     * Valida UUID v4
     */
    static isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Valida parámetros de paginación
     */
    static validatePagination(page, limit) {
        const errors = [];
        
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);
        
        if (isNaN(parsedPage) || parsedPage < 1) {
            errors.push('Page must be a positive integer greater than 0');
        }
        
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
            errors.push('Limit must be a positive integer between 1 and 100');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            page: parsedPage || 1,
            limit: parsedLimit || 50
        };
    }

    /**
     * Valida filtros de fecha
     */
    static validateDateFilters(from, to) {
        const errors = [];
        let fromDate = null;
        let toDate = null;
        
        if (from) {
            fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                errors.push('From date is invalid');
            }
        }
        
        if (to) {
            toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                errors.push('To date is invalid');
            }
        }
        
        if (fromDate && toDate && fromDate > toDate) {
            errors.push('From date cannot be greater than to date');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            fromDate,
            toDate
        };
    }

    /**
     * Valida método HTTP
     */
    static validateHttpMethod(method) {
        if (!method) return { isValid: true, method: null };
        
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        const upperMethod = method.toUpperCase();
        
        return {
            isValid: validMethods.includes(upperMethod),
            method: upperMethod,
            error: validMethods.includes(upperMethod) ? null : 'Invalid HTTP method'
        };
    }

    /**
     * Valida código de status HTTP
     */
    static validateStatusCode(statusCode) {
        if (!statusCode) return { isValid: true, statusCode: null };
        
        const code = parseInt(statusCode);
        const isValid = !isNaN(code) && code >= 100 && code < 600;
        
        return {
            isValid,
            statusCode: code,
            error: isValid ? null : 'Status code must be between 100 and 599'
        };
    }

    /**
     * Valida período de tiempo para estadísticas
     */
    static validateTimePeriod(period, interval) {
        const validPeriods = ['24h', '7d', '30d'];
        const validIntervals = ['1h', '1d'];
        
        const errors = [];
        
        if (period && !validPeriods.includes(period)) {
            errors.push('Period must be one of: 24h, 7d, 30d');
        }
        
        if (interval && !validIntervals.includes(interval)) {
            errors.push('Interval must be one of: 1h, 1d');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            period: period || '24h',
            interval: interval || '1h'
        };
    }

    /**
     * Valida threshold para requests lentas
     */
    static validateThreshold(threshold) {
        if (!threshold) return { isValid: true, threshold: 1000 };
        
        const parsedThreshold = parseInt(threshold);
        const isValid = !isNaN(parsedThreshold) && parsedThreshold >= 0;
        
        return {
            isValid,
            threshold: parsedThreshold,
            error: isValid ? null : 'Threshold must be a non-negative integer'
        };
    }

    /**
     * Valida días para cleanup
     */
    static validateCleanupDays(days) {
        if (!days) return { isValid: true, days: 7 };
        
        const parsedDays = parseInt(days);
        const isValid = !isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 365;
        
        return {
            isValid,
            days: parsedDays,
            error: isValid ? null : 'Days must be between 1 and 365'
        };
    }

    /**
     * Sanitiza string de búsqueda
     */
    static sanitizeSearch(search) {
        if (!search || typeof search !== 'string') {
            return null;
        }
        
        // Remover caracteres especiales peligrosos y limitar longitud
        const sanitized = search
            .trim()
            .replace(/[<>\"']/g, '')
            .substring(0, 100);
            
        return sanitized.length > 0 ? sanitized : null;
    }

    /**
     * Valida data de captura de request
     */
    static validateCaptureData(data) {
        const errors = [];
        
        if (!data.method) {
            errors.push('Method is required');
        } else {
            const methodValidation = this.validateHttpMethod(data.method);
            if (!methodValidation.isValid) {
                errors.push(methodValidation.error);
            }
        }
        
        if (!data.path || typeof data.path !== 'string') {
            errors.push('Path is required and must be a string');
        }
        
        if (data.statusCode !== undefined) {
            const statusValidation = this.validateStatusCode(data.statusCode);
            if (!statusValidation.isValid) {
                errors.push(statusValidation.error);
            }
        }
        
        if (data.uuid && !this.isValidUUID(data.uuid)) {
            errors.push('UUID format is invalid');
        }
        
        if (data.responseTime !== undefined) {
            const responseTime = parseInt(data.responseTime);
            if (isNaN(responseTime) || responseTime < 0) {
                errors.push('Response time must be a non-negative integer');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = ValidationUtils;