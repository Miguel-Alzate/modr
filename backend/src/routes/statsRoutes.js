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
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/', (req, res) => statsController.getSystemStats(req, res));

module.exports = router;