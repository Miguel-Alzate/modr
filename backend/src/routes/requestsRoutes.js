const express = require('express');
const router = express.Router();
const RequestsController = require('../controllers/monitoring/RequestsController');

const requestsController = new RequestsController();

/**
 * @swagger
 * /requests:
 *   get:
 *     summary: Retrieve a list of requests with filters and pagination
 *     description: Fetches requests from the monitoring system with various filtering and pagination options. All parameters are optional.
 *     tags: [Requests]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD]
 *         description: Filter by HTTP method
 *         example: GET
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           minimum: 100
 *           maximum: 599
 *         description: Filter by HTTP status code
 *         example: 404
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search in request paths (case insensitive, max 100 characters)
 *         example: "/api/users"
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter requests from this date onwards
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter requests up to this date
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: only_errors
 *         schema:
 *           type: boolean
 *         description: Show only requests with error status codes (>=400)
 *         example: true
 *     responses:
 *       200:
 *         description: Requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RequestObject'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', (req, res) => requestsController.getRequests(req, res));

/**
 * @swagger
 * /requests/slow-requests:
 *   get:
 *     summary: Retrieve requests that exceed response time threshold
 *     description: Fetches requests that took longer than the specified threshold to complete, ordered by duration (slowest first)
 *     tags: [Requests]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 1000
 *         description: Minimum response time in milliseconds to consider a request slow
 *         example: 2000
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Slow requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/RequestObject'
 *                           - type: object
 *                             properties:
 *                               duration:
 *                                 type: integer
 *                                 description: Response time in milliseconds
 *                                 minimum: 0
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/slow-requests', (req, res) => requestsController.getSlowRequests(req, res));

/**
 * @swagger
 * /requests/error-requests:
 *   get:
 *     summary: Retrieve requests that resulted in errors
 *     description: Fetches requests with HTTP status codes >= 400, with pagination support
 *     tags: [Requests]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Error requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/RequestObject'
 *                           - type: object
 *                             properties:
 *                               status:
 *                                 type: object
 *                                 properties:
 *                                   code:
 *                                     type: integer
 *                                     minimum: 400
 *                                     description: HTTP error status code
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/error-requests', (req, res) => requestsController.getErrorRequests(req, res));

/**
 * @swagger
 * /requests/requests-over-time:
 *   get:
 *     summary: Retrieve time series data for request monitoring
 *     description: Fetches aggregated request data over specified time periods for creating charts and monitoring trends
 *     tags: [Requests]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *         description: Time period to analyze
 *         example: 7d
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1h, 1d]
 *           default: 1h
 *         description: Data grouping interval
 *         example: 1d
 *     responses:
 *       200:
 *         description: Time series data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           time_bucket:
 *                             type: string
 *                             format: date-time
 *                             description: Time bucket for this data point
 *                           request_count:
 *                             type: string
 *                             description: Total requests in this time bucket (as string from DB)
 *                           error_count:
 *                             type: string
 *                             description: Error requests in this time bucket (as string from DB)
 *                         example:
 *                           time_bucket: "2024-01-15T10:00:00.000Z"
 *                           request_count: "145"
 *                           error_count: "3"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/requests-over-time', (req, res) => requestsController.getRequestsOverTime(req, res));

/**
 * @swagger
 * /requests/{id}:
 *   get:
 *     summary: Retrieve detailed information about a specific request
 *     description: Fetches complete details of a request including payload, response, headers, exceptions, and related queries
 *     tags: [Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique UUID of the request
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Request details retrieved successfully
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
 *                         request_id:
 *                           type: string
 *                           format: uuid
 *                         path:
 *                           type: string
 *                         controller:
 *                           type: string
 *                         happened:
 *                           type: string
 *                           format: date-time
 *                         duration:
 *                           type: integer
 *                         status:
 *                           type: object
 *                         method:
 *                           type: object
 *                         payload:
 *                           type: object
 *                           nullable: true
 *                         response:
 *                           type: object
 *                           nullable: true
 *                         headers:
 *                           type: array
 *                           items:
 *                             type: object
 *                         exceptions:
 *                           type: array
 *                           items:
 *                             type: object
 *                         queries:
 *                           type: array
 *                           items:
 *                             type: object
 *                         user:
 *                           type: object
 *                           nullable: true
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   delete:
 *     summary: Delete a specific request and all its associated data
 *     description: Permanently deletes a request and all its related data (payload, response, headers, exceptions, queries) in cascade
 *     tags: [Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique UUID of the request to delete
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Request deleted successfully
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
 *                         request_id:
 *                           type: string
 *                           format: uuid
 *                           description: UUID of the deleted request
 *                         deleted_at:
 *                           type: string
 *                           format: date-time
 *                           description: When the request was deleted
 *                         cascade_deleted:
 *                           type: object
 *                           description: Count of related records that were also deleted
 *                           properties:
 *                             payload:
 *                               type: integer
 *                             response:
 *                               type: integer
 *                             headers:
 *                               type: integer
 *                             exceptions:
 *                               type: integer
 *                             queries:
 *                               type: integer
 *                         message:
 *                           type: string
 *                           description: Success message
 *                           example: "Request and all associated data deleted successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:id', (req, res) => requestsController.getRequestDetails(req, res));
router.delete('/:id', (req, res) => requestsController.deleteRequest(req, res));

module.exports = router;