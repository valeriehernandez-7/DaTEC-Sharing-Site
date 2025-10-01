/**
 * Notification Routes
 * Handles user notification endpoints
 * 
 * @module routes/notification.routes
 * 
 * Routes:
 * - GET    /api/notifications       - Get user notifications
 * - GET    /api/notifications/count - Get notification count
 * - DELETE /api/notifications       - Clear all notifications
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * All notification routes require authentication
 */
router.use(verifyToken);

/**
 * GET /api/notifications
 * Get user's notifications
 * Requires: Authentication
 * 
 * Query params:
 *   - limit: number (optional, default: 50, max: 100)
 * 
 * Response: { success, count, notifications[] }
 */
router.get('/', controller.getUserNotifications);

/**
 * GET /api/notifications/count
 * Get total notification count
 * Requires: Authentication
 * 
 * Response: { success, count }
 */
router.get('/count', controller.getCount);

/**
 * DELETE /api/notifications
 * Clear all notifications
 * Requires: Authentication
 * 
 * Response: { success, message }
 */
router.delete('/', controller.clearAll);

module.exports = router;