/**
 * Vote Routes
 * Handles dataset voting endpoints
 * 
 * @module routes/vote.routes
 * 
 * Routes:
 * - GET    /api/datasets/:datasetId/votes     - Get all votes (HU17)
 * - POST   /api/datasets/:datasetId/votes     - Add/update vote (HU17)
 * - DELETE /api/datasets/:datasetId/votes     - Remove vote (HU17)
 * - GET    /api/datasets/:datasetId/votes/me  - Get current user's vote (HU17)
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/vote.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/datasets/:datasetId/votes
 * Get all votes for a dataset
 * 
 * Response: { success, count, totalVotes, averageRating, votes[] }
 */
router.get('/datasets/:datasetId/votes', controller.getVotes);

/**
 * GET /api/datasets/:datasetId/votes/me
 * Check if current user voted on dataset
 * Requires: Authentication
 * 
 * Response: { success, hasVoted, vote }
 */
router.get('/datasets/:datasetId/votes/me', verifyToken, controller.getUserVote);

/**
 * POST /api/datasets/:datasetId/votes
 * Add or update vote for dataset
 * Requires: Authentication
 * 
 * Body (JSON):
 *   - rating: integer 1-5 (required)
 * 
 * Response: { success, message, vote }
 * 
 * Side effects (HU17):
 *   - Creates/updates vote in MongoDB
 *   - Increments/decrements vote_count in Redis
 * 
 * Note: Cannot vote on own dataset
 */
router.post('/datasets/:datasetId/votes', verifyToken, controller.addVote);

/**
 * DELETE /api/datasets/:datasetId/votes
 * Remove vote from dataset
 * Requires: Authentication
 * 
 * Response: { success, message }
 * 
 * Side effects (HU17):
 *   - Deletes vote from MongoDB
 *   - Decrements vote_count in Redis
 */
router.delete('/datasets/:datasetId/votes', verifyToken, controller.removeVote);

module.exports = router;