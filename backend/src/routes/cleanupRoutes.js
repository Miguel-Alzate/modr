const express = require('express');
const router = express.Router();
const CleanUpController = require('../controllers/monitoring/CleanUpController');

const cleanUpController = new CleanUpController();

/**
 * @swagger
 * /cleanup:
 *   delete:
 *     summary: Clean up old monitoring data
 *     description: Removes requests older than the specified number of days to maintain database performance and manage storage
 *     tags: [CleanUp]
 *     parameters:
 *       - $ref: '#/components/parameters/DaysParam'
 *     responses:
 *       200:
 *         description: Cleanup operation completed successfully
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
 *                         deleted_count:
 *                           type: integer
 *                           description: Number of requests that were deleted
 *                           example: 1250
 *                         cutoff_date:
 *                           type: string
 *                           format: date-time
 *                           description: Date cutoff used for deletion
 *                         days_cleaned:
 *                           type: integer
 *                           description: Number of days that were cleaned
 *                           example: 30
 *                         cleanup_completed_at:
 *                           type: string
 *                           format: date-time
 *                           description: When the cleanup operation finished
 *                         message:
 *                           type: string
 *                           description: Success message with cleanup details
 *                           example: "Successfully cleaned 1250 requests older than 30 days"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/', (req, res) => cleanUpController.cleanupOldRequests(req, res));

/**
 * @swagger
 * /cleanup/cleanup-by-status:
 *   delete:
 *     summary: Clean up requests by HTTP status code
 *     description: Removes requests with a specific HTTP status code older than the specified number of days
 *     tags: [CleanUp]
 *     parameters:
 *       - name: statusCode
 *         in: query
 *         required: true
 *         description: HTTP status code to filter by
 *         schema:
 *           type: integer
 *           minimum: 100
 *           maximum: 599
 *           example: 404
 *       - $ref: '#/components/parameters/DaysParam'
 *     requestBody:
 *       description: Status code and days can also be sent in request body
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statusCode:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 599
 *                 example: 404
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 example: 7
 *     responses:
 *       200:
 *         description: Status-specific cleanup completed successfully
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
 *                         deleted_count:
 *                           type: integer
 *                           description: Number of requests that were deleted
 *                           example: 45
 *                         cutoff_date:
 *                           type: string
 *                           format: date-time
 *                           description: Date cutoff used for deletion
 *                         status_code:
 *                           type: integer
 *                           description: HTTP status code that was cleaned
 *                           example: 404
 *                         days_cleaned:
 *                           type: integer
 *                           description: Number of days that were cleaned
 *                           example: 7
 *                         cleanup_completed_at:
 *                           type: string
 *                           format: date-time
 *                           description: When the cleanup operation finished
 *                         message:
 *                           type: string
 *                           description: Success message with cleanup details
 *                           example: "Successfully cleaned 45 requests with status 404 older than 7 days"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/cleanup-by-status', (req, res) => cleanUpController.cleanupByStatus(req, res));

/**
 * @swagger
 * /cleanup/cleanup-by-method:
 *   delete:
 *     summary: Clean up requests by HTTP method
 *     description: Removes requests with a specific HTTP method older than the specified number of days
 *     tags: [CleanUp]
 *     parameters:
 *       - name: method
 *         in: query
 *         required: true
 *         description: HTTP method to filter by
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD]
 *           example: DELETE
 *       - $ref: '#/components/parameters/DaysParam'
 *     requestBody:
 *       description: Method and days can also be sent in request body
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD]
 *                 example: DELETE
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 example: 7
 *     responses:
 *       200:
 *         description: Method-specific cleanup completed successfully
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
 *                         deleted_count:
 *                           type: integer
 *                           description: Number of requests that were deleted
 *                           example: 123
 *                         cutoff_date:
 *                           type: string
 *                           format: date-time
 *                           description: Date cutoff used for deletion
 *                         method:
 *                           type: string
 *                           description: HTTP method that was cleaned
 *                           example: "DELETE"
 *                         days_cleaned:
 *                           type: integer
 *                           description: Number of days that were cleaned
 *                           example: 7
 *                         cleanup_completed_at:
 *                           type: string
 *                           format: date-time
 *                           description: When the cleanup operation finished
 *                         message:
 *                           type: string
 *                           description: Success message with cleanup details
 *                           example: "Successfully cleaned 123 DELETE requests older than 7 days"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/cleanup-by-method', (req, res) => cleanUpController.cleanupByMethod(req, res));

/**
 * @swagger
 * /cleanup/preview:
 *   get:
 *     summary: Preview cleanup operation without executing
 *     description: Shows statistics about what would be deleted in a cleanup operation without actually deleting anything
 *     tags: [CleanUp]
 *     parameters:
 *       - $ref: '#/components/parameters/DaysParam'
 *     responses:
 *       200:
 *         description: Cleanup preview generated successfully
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
 *                         days_to_clean:
 *                           type: integer
 *                           description: Number of days to clean
 *                           example: 7
 *                         cutoff_date:
 *                           type: string
 *                           format: date-time
 *                           description: Date cutoff that would be used for deletion
 *                         requests_to_delete:
 *                           type: integer
 *                           description: Total number of requests that would be deleted
 *                           example: 850
 *                         error_requests_to_delete:
 *                           type: integer
 *                           description: Number of error requests that would be deleted
 *                           example: 230
 *                         success_requests_to_delete:
 *                           type: integer
 *                           description: Number of successful requests that would be deleted
 *                           example: 620
 *                         total_requests_in_system:
 *                           type: integer
 *                           description: Total number of requests in the system
 *                           example: 5000
 *                         cleanup_percentage:
 *                           type: number
 *                           format: float
 *                           description: Percentage of requests that would be deleted
 *                           example: 17.00
 *                         oldest_request:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Date of the oldest request in the system
 *                         estimated_space_freed:
 *                           type: string
 *                           description: Estimated disk space that would be freed
 *                           example: "425.00 KB"
 *                         preview_mode:
 *                           type: boolean
 *                           description: Indicates this is a preview operation
 *                           example: true
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/preview', (req, res) => cleanUpController.getCleanupPreview(req, res));

module.exports = router;