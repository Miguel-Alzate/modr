const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/monitoring/StatsController');

const statsController = new StatsController();

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Retrieve comprehensive system statistics
 *     description: Fetches general monitoring statistics including request counts, error rates, performance metrics, and method distribution
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of requests in the system
 *                           example: 15420
 *                         errors:
 *                           type: integer
 *                           description: Total number of error requests (status >= 400)
 *                           example: 234
 *                         successRate:
 *                           type: number
 *                           format: float
 *                           description: Success rate as a percentage
 *                           example: 98.48
 *                         avgResponseTime:
 *                           type: integer
 *                           description: Average response time in milliseconds
 *                           example: 145
 *                         requests24h:
 *                           type: integer
 *                           description: Requests in the last 24 hours
 *                           example: 1205
 *                         errors24h:
 *                           type: integer
 *                           description: Errors in the last 24 hours
 *                           example: 23
 *                         requests7d:
 *                           type: integer
 *                           description: Requests in the last 7 days
 *                           example: 8450
 *                         slowRequests:
 *                           type: integer
 *                           description: Number of slow requests (>1000ms)
 *                           example: 45
 *                         methodStats:
 *                           type: object
 *                           description: Request count by HTTP method
 *                           additionalProperties:
 *                             type: integer
 *                           example:
 *                             GET: 8950
 *                             POST: 3420
 *                             PUT: 1850
 *                             DELETE: 1200
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                           description: When the statistics were calculated
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', (req, res) => statsController.getSystemStats(req, res));

/**
 * @swagger
 * /stats/error-stats:
 *   get:
 *     summary: Retrieve error statistics by status code
 *     description: Fetches detailed error statistics grouped by HTTP status codes, including count and average duration for each error type
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Error statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       description: Array of error statistics grouped by status code
 *                       items:
 *                         type: object
 *                         properties:
 *                           statusCode:
 *                             type: integer
 *                             description: HTTP status code
 *                             example: 404
 *                           description:
 *                             type: string
 *                             description: Status code description
 *                             example: "Not Found"
 *                           count:
 *                             type: integer
 *                             description: Number of requests with this status code
 *                             example: 125
 *                           avgDuration:
 *                             type: integer
 *                             description: Average duration for requests with this status code in milliseconds
 *                             example: 89
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/error-stats', (req, res) => statsController.getErrorStats(req, res));

/**
 * @swagger
 * /stats/top-endpoints:
 *   get:
 *     summary: Retrieve top most used endpoints
 *     description: Fetches the most frequently accessed endpoints with their request counts, average duration, and error statistics
 *     tags: [Stats]
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of endpoints to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           example: 15
 *     responses:
 *       200:
 *         description: Top endpoints retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       description: Array of top endpoints sorted by request count
 *                       items:
 *                         type: object
 *                         properties:
 *                           path:
 *                             type: string
 *                             description: Endpoint path
 *                             example: "/api/users"
 *                           requestCount:
 *                             type: integer
 *                             description: Total number of requests to this endpoint
 *                             example: 2450
 *                           avgDuration:
 *                             type: integer
 *                             description: Average response time for this endpoint in milliseconds
 *                             example: 156
 *                           errorCount:
 *                             type: integer
 *                             description: Number of error requests for this endpoint
 *                             example: 23
 *                           errorRate:
 *                             type: string
 *                             description: Error rate as a percentage string
 *                             example: "0.94"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/top-endpoints', (req, res) => statsController.getTopEndpoints(req, res));

/**
 * @swagger
 * /stats/performance-stats:
 *   get:
 *     summary: Retrieve performance statistics
 *     description: Fetches detailed performance metrics including response time percentiles and statistics for the last 24 hours
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Performance statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalRequests:
 *                           type: integer
 *                           description: Total number of requests in the analyzed period
 *                           example: 3450
 *                         avgResponseTime:
 *                           type: integer
 *                           description: Average response time in milliseconds
 *                           example: 145
 *                         minResponseTime:
 *                           type: integer
 *                           description: Minimum response time in milliseconds
 *                           example: 12
 *                         maxResponseTime:
 *                           type: integer
 *                           description: Maximum response time in milliseconds
 *                           example: 4567
 *                         medianResponseTime:
 *                           type: integer
 *                           description: Median response time in milliseconds (50th percentile)
 *                           example: 89
 *                         p95ResponseTime:
 *                           type: integer
 *                           description: 95th percentile response time in milliseconds
 *                           example: 567
 *                         p99ResponseTime:
 *                           type: integer
 *                           description: 99th percentile response time in milliseconds
 *                           example: 1234
 *                         period:
 *                           type: string
 *                           description: Time period analyzed for these statistics
 *                           example: "Last 24 hours"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/performance-stats', (req, res) => statsController.getPerformanceStats(req, res));

module.exports = router;