/**
 * Admin Routes
 * Administrative endpoints for dataset and comment moderation
 * All routes require admin privileges
 * 
 * @module routes/admin.routes
 * 
 * Routes:
 * - GET    /api/admin/datasets/pending      - List pending datasets (HU8)
 * - PATCH  /api/admin/datasets/:datasetId   - Approve/reject dataset (HU8)
 * - PATCH  /api/admin/comments/:commentId/disable - Disable comment (HU16)
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/**
 * All admin routes require authentication AND admin privileges
 * Apply middleware to all routes in this router
 */
router.use(verifyToken);
router.use(verifyAdmin);

/**
 * GET /api/admin/datasets/pending
 * List all datasets pending review
 * Requires: Admin privileges
 * 
 * Response: { success, count, datasets[] }
 * 
 * Note: Datasets are sorted by creation date (oldest first)
 */
router.get('/datasets/pending', controller.listPendingDatasets);

/**
 * PATCH /api/admin/datasets/:datasetId
 * Approve or reject a dataset
 * Requires: Admin privileges
 * 
 * Body (JSON):
 *   - action: "approve" | "reject" (required)
 *   - admin_review: string (optional, admin's comment)
 * 
 * Response: { success, message, dataset }
 * 
 * Side effects (HU8):
 *   - Updates dataset status in MongoDB
 *   - Sends notification to dataset owner via Redis
 * 
 * Note: Only pending datasets can be reviewed
 */
router.patch('/datasets/:datasetId', controller.reviewDataset);

/**
 * PATCH /api/admin/comments/:commentId/disable
 * Disable an inappropriate comment
 * Requires: Admin privileges
 * 
 * Response: { success, message, comment_id }
 * 
 * Side effects (HU16):
 *   - Sets is_active to false (soft delete)
 *   - Records disabled_at timestamp
 *   - Records admin who disabled it
 * 
 * Note: Disabled comments are hidden but not deleted
 */
router.patch('/comments/:commentId/disable', controller.disableComment);

module.exports = router;