const express = require('express');
const router = express.Router();
const MonitoringService = require('../services/MonitoringService');

// Instanciar el servicio de monitoreo
const monitoringService = new MonitoringService();

/**
 * @swagger
 * tags:
 *   name: MODR
 *   description: API endpoints para el dashboard de monitoreo MODR
 */

/**
 * @swagger
 * /modr/requests:
 *   get:
 *     summary: Obtener lista de requests con filtros y paginación
 *     tags: [MODR]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Cantidad de requests por página
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *         description: Filtrar por método HTTP (GET, POST, etc.)
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: Filtrar por código de estado HTTP
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en path y URL
 *       - in: query
 *         name: only_errors
 *         schema:
 *           type: boolean
 *         description: Solo mostrar requests con errores (status >= 400)
 *     responses:
 *       200:
 *         description: Lista de requests exitosa
 */
router.get('/requests', async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: Math.min(parseInt(req.query.limit) || 50, 500), // Max 500
            method: req.query.method,
            status: req.query.status ? parseInt(req.query.status) : undefined,
            search: req.query.search,
            onlyErrors: req.query.only_errors === 'true'
        };

        const result = await monitoringService.getRequests(filters);
        
        res.json({
            success: true,
            data: result.requests,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages
            }
        });
    } catch (error) {
        console.error('[MODR] Error getting requests:', error);
        res.status(500).json({
            success: false,
            error: 'Error retrieving requests',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /modr/requests/{uuid}:
 *   get:
 *     summary: Obtener detalles completos de una request específica
 *     tags: [MODR]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID único de la request
 *     responses:
 *       200:
 *         description: Detalles de la request
 *       404:
 *         description: Request no encontrada
 */
router.get('/requests/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const requestDetails = await monitoringService.getRequestDetails(uuid);
        
        if (!requestDetails) {
            return res.status(404).json({
                success: false,
                error: 'Request not found',
                message: `Request with UUID ${uuid} not found`
            });
        }

        res.json({
            success: true,
            data: requestDetails
        });
    } catch (error) {
        console.error('[MODR] Error getting request details:', error);
        res.status(500).json({
            success: false,
            error: 'Error retrieving request details',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /modr/stats:
 *   get:
 *     summary: Obtener estadísticas generales del sistema
 *     tags: [MODR]
 *     responses:
 *       200:
 *         description: Estadísticas del sistema
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await monitoringService.getSystemStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('[MODR] Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error retrieving system stats',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /modr/slow-requests:
 *   get:
 *     summary: Obtener requests lentas
 *     tags: [MODR]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Tiempo mínimo en milisegundos para considerar una request lenta
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Cantidad máxima de requests a retornar
 *     responses:
 *       200:
 *         description: Lista de requests lentas
 */
router.get('/slow-requests', async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 1000;
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        
        const slowRequests = await monitoringService.getSlowRequests(threshold, limit);
        
        res.json({
            success: true,
            data: slowRequests,
            filters: {
                threshold,
                limit
            }
        });
    } catch (error) {
        console.error('[MODR] Error getting slow requests:', error);
        res.status(500).json({
            success: false,
            error: 'Error retrieving slow requests',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /modr/error-requests:
 *   get:
 *     summary: Obtener requests con errores
 *     tags: [MODR]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Cantidad de requests por página
 *     responses:
 *       200:
 *         description: Lista de requests con errores
 */
router.get('/error-requests', async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: Math.min(parseInt(req.query.limit) || 50, 500),
            onlyErrors: true
        };

        const result = await monitoringService.getRequests(filters);
        
        res.json({
            success: true,
            data: result.requests,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages
            }
        });
    } catch (error) {
        console.error('[MODR] Error getting error requests:', error);
        res.status(500).json({
            success: false,
            error: 'Error retrieving error requests',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /modr/requests-over-time:
 *   get:
 *     summary: Obtener estadísticas de requests por tiempo para gráficos
 *     tags: [MODR]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *         description: Período de tiempo a analizar
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1h, 1d]
 *           default: 1h
 *         description: Intervalo de agrupación
 *     responses:
 *       200:
 *         description: Datos para gráficos de requests por tiempo
 */
router.get('/requests-over-time', async (req, res) => {
    try {
        const period = req.query.period || '24h';
        const interval = req.query.interval || '1h';
        
        const timeSeriesData = await monitoringService.getRequestsOverTime(period, interval);
        
        res.json({
            success: true,
            data: timeSeriesData,
            filters: {
                period,
                interval
            }
        });
    } catch (error) {
        console.error('[MODR] Error getting requests over time:', error);
        res.status(500).json({
            success: false,
            error: 'Error retrieving requests over time data',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /modr/cleanup:
 *   delete:
 *     summary: Limpiar requests antiguas
 *     tags: [MODR]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Eliminar requests más antiguos que X días
 *     responses:
 *       200:
 *         description: Limpieza completada exitosamente
 */
router.delete('/cleanup', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const result = await monitoringService.cleanupOldRequests(days);
        
        res.json({
            success: true,
            message: `Cleaned up requests older than ${days} days`,
            data: {
                deletedCount: result.deletedCount,
                days: days
            }
        });
    } catch (error) {
        console.error('[MODR] Error cleaning up requests:', error);
        res.status(500).json({
            success: false,
            error: 'Error cleaning up old requests',
            message: error.message
        });
    }
});

module.exports = router;
