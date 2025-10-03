/**
 * Admin Controller
 * Handles administrative operations
 * 
 * @module controllers/admin.controller
 * 
 * Dependencies:
 * - MongoDB: Dataset and comment management
 * - Redis: Send notifications to users
 */

const { getMongo } = require('../config/databases');
const { sendNotification } = require('../utils/notifications');

/**
 * HU8 - Approve or reject a dataset
 * PATCH /api/admin/datasets/:datasetId
 * 
 * Admin can approve or reject pending datasets
 * Sends notification to dataset owner
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function reviewDataset(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;
        const { action, admin_review } = req.body;

        // Validate action
        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be "approve" or "reject"'
            });
        }

        // Get dataset
        const dataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Check if dataset is pending
        if (dataset.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Dataset is already ${dataset.status}. Only pending datasets can be reviewed.`
            });
        }

        // Update dataset status
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        await db.collection('datasets').updateOne(
            { dataset_id: datasetId },
            {
                $set: {
                    status: newStatus,
                    reviewed_at: new Date(),
                    admin_review: admin_review || null,
                    updated_at: new Date()
                }
            }
        );

        // Send notification to dataset owner
        try {
            await sendNotification(dataset.owner_user_id, {
                type: action === 'approve' ? 'dataset_approved' : 'dataset_rejected',
                dataset_id: dataset.dataset_id,
                dataset_name: dataset.dataset_name,
                admin_review: admin_review || null,
                reviewed_by: req.user.username,
                timestamp: new Date().toISOString()
            });
        } catch (notifError) {
            console.error('Failed to send notification to owner:', notifError.message);
            // Don't fail the request if notification fails
        }

        // Note: Followers are NOT notified here.
        // They will be notified when the owner makes the dataset public
        // via PATCH /api/datasets/:datasetId/visibility

        res.json({
            success: true,
            message: `Dataset ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            dataset: {
                dataset_id: datasetId,
                status: newStatus,
                reviewed_at: new Date(),
                admin_review: admin_review || null
            }
        });

    } catch (error) {
        console.error('Error reviewing dataset:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU8 - List all pending datasets
 * GET /api/admin/datasets/pending
 * 
 * Returns all datasets waiting for admin review
 * Sorted by creation date (oldest first)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function listPendingDatasets(req, res) {
    try {
        const db = getMongo();

        // Get all pending datasets
        const datasets = await db.collection('datasets').find({
            status: 'pending'
        })
            .sort({ created_at: 1 }) // Oldest first (FIFO)
            .toArray();

        // Enrich with owner information
        const enrichedDatasets = await Promise.all(
            datasets.map(async (dataset) => {
                const owner = await db.collection('users').findOne(
                    { user_id: dataset.owner_user_id },
                    { projection: { username: 1, full_name: 1 } }
                );

                return {
                    dataset_id: dataset.dataset_id,
                    dataset_name: dataset.dataset_name,
                    description: dataset.description,
                    owner: owner ? {
                        username: owner.username,
                        fullName: owner.full_name
                    } : null,
                    file_count: dataset.file_references.length,
                    created_at: dataset.created_at,
                    tags: dataset.tags
                };
            })
        );

        res.json({
            success: true,
            count: enrichedDatasets.length,
            datasets: enrichedDatasets
        });

    } catch (error) {
        console.error('Error listing pending datasets:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * PATCH /api/admin/comments/:commentId/enable
 * Re-enable a previously disabled comment
 * 
 * Admin can restore hidden comments
 * Sets is_active to true
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function enableComment(req, res) {
    try {
        const db = getMongo();
        const { commentId } = req.params;

        // Check if comment exists
        const comment = await db.collection('comments').findOne({
            comment_id: commentId
        });

        if (!comment) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        // Check if comment is already active
        if (comment.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Comment is already active'
            });
        }

        // Re-enable: set is_active to true and clear disabled fields
        await db.collection('comments').updateOne(
            { comment_id: commentId },
            {
                $set: {
                    is_active: true
                },
                $unset: {
                    disabled_at: "",
                    disabled_by: ""
                }
            }
        );

        res.json({
            success: true,
            message: 'Comment enabled successfully',
            comment_id: commentId
        });

    } catch (error) {
        console.error('Error enabling comment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU16 - Disable a comment (soft delete)
 * PATCH /api/admin/comments/:commentId/disable
 * 
 * Admin can disable inappropriate comments
 * Sets is_active to false (soft delete)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function disableComment(req, res) {
    try {
        const db = getMongo();
        const { commentId } = req.params;

        // Check if comment exists
        const comment = await db.collection('comments').findOne({
            comment_id: commentId
        });

        if (!comment) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        // Check if comment is already disabled
        if (!comment.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Comment is already disabled'
            });
        }

        // Soft delete: set is_active to false
        await db.collection('comments').updateOne(
            { comment_id: commentId },
            {
                $set: {
                    is_active: false,
                    disabled_at: new Date(),
                    disabled_by: req.user.userId
                }
            }
        );

        res.json({
            success: true,
            message: 'Comment disabled successfully',
            comment_id: commentId
        });

    } catch (error) {
        console.error('Error disabling comment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * GET /api/admin/comments/disabled
 * List all disabled comments across all datasets
 * 
 * Returns centralized list of hidden comments with dataset and author info
 * Sorted by disabled_at (most recent first)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function listDisabledComments(req, res) {
    try {
        const db = getMongo();

        // Get all disabled comments
        const disabledComments = await db.collection('comments').find({
            is_active: false
        })
            .sort({ disabled_at: -1 })  // Most recently disabled first
            .toArray();

        // Enrich with dataset and author information
        const enrichedComments = await Promise.all(
            disabledComments.map(async (comment) => {
                // Get dataset info
                const dataset = await db.collection('datasets').findOne(
                    { dataset_id: comment.target_dataset_id },
                    { projection: { dataset_id: 1, dataset_name: 1 } }
                );

                // Get author info
                const author = await db.collection('users').findOne(
                    { user_id: comment.author_user_id },
                    { projection: { username: 1, full_name: 1 } }
                );

                // Get admin who disabled it
                const disabledBy = await db.collection('users').findOne(
                    { user_id: comment.disabled_by },
                    { projection: { username: 1 } }
                );

                return {
                    comment_id: comment.comment_id,
                    content: comment.content,
                    dataset: dataset ? {
                        dataset_id: dataset.dataset_id,
                        dataset_name: dataset.dataset_name
                    } : null,
                    author: author ? {
                        user_id: author.user_id,
                        username: author.username,
                        full_name: author.full_name
                    } : null,
                    created_at: comment.created_at,
                    disabled_at: comment.disabled_at,
                    disabled_by: disabledBy ? disabledBy.username : null
                };
            })
        );

        res.json({
            success: true,
            count: enrichedComments.length,
            comments: enrichedComments
        });

    } catch (error) {
        console.error('Error listing disabled comments:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * GET /api/admin/stats
 * Get dashboard statistics for admin panel
 * 
 * Returns counts of users, admins, datasets, and pending approvals
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getStats(req, res) {
    try {
        const db = getMongo();

        // Count total admins
        const totalAdmins = await db.collection('users').countDocuments({
            is_admin: true
        });

        // Count total users
        const totalUsers = await db.collection('users').countDocuments();

        // Count total datasets
        const totalDatasets = await db.collection('datasets').countDocuments();

        // Count pending datasets
        const pendingDatasets = await db.collection('datasets').countDocuments({
            status: 'pending'
        });

        res.json({
            success: true,
            stats: {
                total_admins: totalAdmins,
                total_users: totalUsers,
                total_datasets: totalDatasets,
                pending_datasets: pendingDatasets
            }
        });

    } catch (error) {
        console.error('Error getting admin stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    reviewDataset,          // HU8
    listPendingDatasets,    // HU8
    enableComment,          // HU16
    disableComment,         // HU16
    listDisabledComments,
    getStats
};