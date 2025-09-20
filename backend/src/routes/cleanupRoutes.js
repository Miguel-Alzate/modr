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
 *                         cutoff_date:
 *                           type: string
 *                           format: date-time
 *                         requests_to_delete:
 *                           type: integer
 *                         error_requests_to_delete:
 *                           type: integer
 *                         success_requests_to_delete:
 *                           type: integer
 *                         total_requests_in_system:
 *                           type: integer
 *                         cleanup_percentage:
 *                           type: number
 *                           format: float
 *                         oldest_request:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         estimated_space_freed:
 *                           type: string
 *                         preview_mode:
 *                           type: boolean
 *                           example: true
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/preview', (req, res) => cleanUpController.getCleanupPreview(req, res));

module.exports = router;