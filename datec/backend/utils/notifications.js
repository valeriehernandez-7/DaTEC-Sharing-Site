/**
 * Notification Manager
 * Handles user notifications using Redis lists (FIFO queue)
 * Used by: HU8 (approval notifications), HU19 (follow/new dataset notifications)
 * 
 * @module utils/notifications
 */

const { getRedis } = require('../config/databases');

/**
 * Send a notification to a user
 * Adds notification to user's queue and maintains max 50 recent notifications
 * 
 * @param {string} userId - Target user ID
 * @param {Object} notification - Notification object with type, timestamp, and type-specific data
 * @returns {number} Length of notification queue after push
 * @throws {Error} If notification fails
 */
async function sendNotification(userId, notification) {
    try {
        const { primary } = getRedis();

        // Validate notification structure
        if (!notification.type) {
            throw new Error('Notification type is required');
        }

        if (!notification.timestamp) {
            notification.timestamp = new Date().toISOString();
        }

        // Validate notification type
        const validTypes = [
            'new_follower',
            'new_dataset',
            'dataset_approved',
            'dataset_rejected'
        ];

        if (!validTypes.includes(notification.type)) {
            throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
        }

        const key = `notifications:user:${userId}`;

        // Push notification to the left (newest first)
        const queueLength = await primary.lPush(key, JSON.stringify(notification));

        // Keep only last 50 notifications
        await primary.lTrim(key, 0, 49);

        return queueLength;

    } catch (error) {
        console.error('Redis send notification failed:', error.message);
        throw new Error(`Failed to send notification: ${error.message}`);
    }
}

/**
 * Get user notifications
 * 
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of notifications to retrieve (default: 50)
 * @returns {Array} Array of notification objects (parsed from JSON)
 * @throws {Error} If retrieval fails
 */
async function getNotifications(userId, limit = 50) {
    try {
        const { replica } = getRedis();

        const key = `notifications:user:${userId}`;

        // Get notifications (0 to limit-1)
        const notifications = await replica.lRange(key, 0, limit - 1);

        // Parse JSON strings to objects
        return notifications.map(notification => {
            try {
                return JSON.parse(notification);
            } catch (error) {
                console.error('Failed to parse notification:', error.message);
                return null;
            }
        }).filter(n => n !== null);

    } catch (error) {
        console.error('Redis get notifications failed:', error.message);
        throw new Error(`Failed to get notifications: ${error.message}`);
    }
}

/**
 * Get notification count for a user
 * 
 * @param {string} userId - User ID
 * @returns {number} Total number of notifications
 * @throws {Error} If retrieval fails
 */
async function getNotificationCount(userId) {
    try {
        const { replica } = getRedis();

        const key = `notifications:user:${userId}`;

        const count = await replica.lLen(key);

        return count;

    } catch (error) {
        console.error('Redis get notification count failed:', error.message);
        throw new Error(`Failed to get notification count: ${error.message}`);
    }
}

/**
 * Clear all notifications for a user
 * 
 * @param {string} userId - User ID
 * @returns {boolean} True if notifications cleared successfully
 * @throws {Error} If deletion fails
 */
async function clearNotifications(userId) {
    try {
        const { primary } = getRedis();

        const key = `notifications:user:${userId}`;

        const result = await primary.del(key);

        return result > 0;

    } catch (error) {
        console.error('Redis clear notifications failed:', error.message);
        throw new Error(`Failed to clear notifications: ${error.message}`);
    }
}

/**
 * Clear old notifications (keep only recent N notifications)
 * 
 * @param {string} userId - User ID
 * @param {number} keepCount - Number of recent notifications to keep (default: 50)
 * @returns {boolean} True if trimmed successfully
 * @throws {Error} If trim fails
 */
async function trimNotifications(userId, keepCount = 50) {
    try {
        const { primary } = getRedis();

        const key = `notifications:user:${userId}`;

        await primary.lTrim(key, 0, keepCount - 1);

        return true;

    } catch (error) {
        console.error('Redis trim notifications failed:', error.message);
        throw new Error(`Failed to trim notifications: ${error.message}`);
    }
}

/**
 * Send notification to multiple users
 * Useful for broadcasting (e.g., notifying all followers)
 * 
 * @param {string[]} userIds - Array of user IDs
 * @param {Object} notification - Notification object
 * @returns {number} Number of users notified successfully
 * @throws {Error} If broadcast fails
 */
async function broadcastNotification(userIds, notification) {
    try {
        let successCount = 0;

        for (const userId of userIds) {
            try {
                await sendNotification(userId, notification);
                successCount++;
            } catch (error) {
                console.error(`Failed to notify user ${userId}:`, error.message);
                // Continue with other users
            }
        }

        return successCount;

    } catch (error) {
        console.error('Redis broadcast notification failed:', error.message);
        throw new Error(`Failed to broadcast notification: ${error.message}`);
    }
}

/**
 * Create notification object for new follower
 * 
 * @param {string} fromUserId - Follower user ID
 * @param {string} fromUsername - Follower username
 * @returns {Object} Notification object
 */
function createFollowerNotification(fromUserId, fromUsername) {
    return {
        type: 'new_follower',
        from_user_id: fromUserId,
        from_username: fromUsername,
        timestamp: new Date().toISOString()
    };
}

/**
 * Create notification object for new dataset
 * 
 * @param {string} fromUserId - Dataset owner user ID
 * @param {string} datasetId - Dataset ID
 * @param {string} datasetName - Dataset name
 * @returns {Object} Notification object
 */
function createDatasetNotification(fromUserId, datasetId, datasetName) {
    return {
        type: 'new_dataset',
        from_user_id: fromUserId,
        dataset_id: datasetId,
        dataset_name: datasetName,
        timestamp: new Date().toISOString()
    };
}

/**
 * Create notification object for dataset approval
 * 
 * @param {string} datasetId - Dataset ID
 * @param {string} datasetName - Dataset name
 * @param {string} adminReview - Optional admin review comment
 * @returns {Object} Notification object
 */
function createApprovalNotification(datasetId, datasetName, adminReview = null) {
    return {
        type: 'dataset_approved',
        dataset_id: datasetId,
        dataset_name: datasetName,
        admin_review: adminReview,
        timestamp: new Date().toISOString()
    };
}

/**
 * Create notification object for dataset rejection
 * 
 * @param {string} datasetId - Dataset ID
 * @param {string} datasetName - Dataset name
 * @param {string} adminReview - Optional admin review comment
 * @returns {Object} Notification object
 */
function createRejectionNotification(datasetId, datasetName, adminReview = null) {
    return {
        type: 'dataset_rejected',
        dataset_id: datasetId,
        dataset_name: datasetName,
        admin_review: adminReview,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    sendNotification,
    getNotifications,
    getNotificationCount,
    clearNotifications,
    trimNotifications,
    broadcastNotification,
    createFollowerNotification,
    createDatasetNotification,
    createApprovalNotification,
    createRejectionNotification
};