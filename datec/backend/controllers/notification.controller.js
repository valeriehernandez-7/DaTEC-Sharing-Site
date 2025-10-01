/**
 * Notification Controller
 * Handles user notification retrieval
 * 
 * @module controllers/notification.controller
 * 
 * Dependencies:
 * - Redis: Read notification queues
 */

const { getNotifications, getNotificationCount, clearNotifications } = require('../utils/notifications');

/**
 * Get user notifications
 * GET /api/notifications
 * 
 * Returns user's notification queue
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserNotifications(req, res) {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 50;

        // Get notifications from Redis
        const notifications = await getNotifications(userId, limit);

        res.json({
            success: true,
            count: notifications.length,
            notifications: notifications
        });

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Get notification count
 * GET /api/notifications/count
 * 
 * Returns total number of unread notifications
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCount(req, res) {
    try {
        const userId = req.user.userId;

        const count = await getNotificationCount(userId);

        res.json({
            success: true,
            count: count
        });

    } catch (error) {
        console.error('Error getting notification count:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Clear all notifications
 * DELETE /api/notifications
 * 
 * Clears user's notification queue
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function clearAll(req, res) {
    try {
        const userId = req.user.userId;

        await clearNotifications(userId);

        res.json({
            success: true,
            message: 'All notifications cleared'
        });

    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    getUserNotifications,
    getCount,
    clearAll
};