/**
 * Vote Controller
 * Handles dataset voting functionality
 * 
 * @module controllers/vote.controller
 * 
 * Dependencies:
 * - MongoDB: Store vote records
 * - Redis: Real-time vote counters
 */

const { getMongo } = require('../config/databases');
const { incrementCounter, decrementCounter, getCounter } = require('../utils/redis-counters');

/**
 * HU17 - Add or update vote for a dataset
 * POST /api/datasets/:datasetId/votes
 * 
 * Users can vote 1-5 stars on a dataset
 * Updates existing vote if user already voted
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function addVote(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;
        const { rating } = req.body;

        // Validate rating
        if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be an integer between 1 and 5'
            });
        }

        // Verify dataset exists and is public
        const dataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Only approved and public datasets can be voted
        if (dataset.status !== 'approved' || !dataset.is_public) {
            return res.status(403).json({
                success: false,
                error: 'Only approved and public datasets can be voted'
            });
        }

        // Cannot vote own dataset
        if (dataset.owner_user_id === req.user.userId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot vote on your own dataset'
            });
        }

        // Check if user already voted
        const existingVote = await db.collection('votes').findOne({
            target_dataset_id: datasetId,
            voter_user_id: req.user.userId
        });

        if (existingVote) {
            // Update existing vote
            const oldRating = existingVote.rating;

            await db.collection('votes').updateOne(
                { vote_id: existingVote.vote_id },
                {
                    $set: {
                        rating: rating,
                        updated_at: new Date()
                    }
                }
            );

            // Adjust Redis counter (remove old, add new)
            if (oldRating !== rating) {
                await decrementCounter(`vote_count:dataset:${datasetId}`);
                await incrementCounter(`vote_count:dataset:${datasetId}`);
            }

            res.json({
                success: true,
                message: 'Vote updated successfully',
                vote: {
                    vote_id: existingVote.vote_id,
                    rating: rating,
                    previous_rating: oldRating
                }
            });

        } else {
            // Create new vote
            const vote_id = `vote_${datasetId}_user_${req.user.userId}`;

            const vote = {
                vote_id: vote_id,
                target_dataset_id: datasetId,
                voter_user_id: req.user.userId,
                rating: rating,
                created_at: new Date(),
                updated_at: new Date()
            };

            await db.collection('votes').insertOne(vote);

            // Increment Redis counter
            await incrementCounter(`vote_count:dataset:${datasetId}`);

            res.status(201).json({
                success: true,
                message: 'Vote added successfully',
                vote: {
                    vote_id: vote_id,
                    rating: rating
                }
            });
        }

    } catch (error) {
        console.error('Error adding vote:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU17 - Remove vote from dataset
 * DELETE /api/datasets/:datasetId/votes
 * 
 * Removes user's vote from dataset
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function removeVote(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;

        // Find and delete vote
        const vote = await db.collection('votes').findOne({
            target_dataset_id: datasetId,
            voter_user_id: req.user.userId
        });

        if (!vote) {
            return res.status(404).json({
                success: false,
                error: 'Vote not found'
            });
        }

        await db.collection('votes').deleteOne({
            vote_id: vote.vote_id
        });

        // Decrement Redis counter
        await decrementCounter(`vote_count:dataset:${datasetId}`);

        res.json({
            success: true,
            message: 'Vote removed successfully'
        });

    } catch (error) {
        console.error('Error removing vote:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU17 - Get all votes for a dataset
 * GET /api/datasets/:datasetId/votes
 * 
 * Returns list of all votes with voter information
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getVotes(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;

        // Get all votes for dataset
        const votes = await db.collection('votes').find({
            target_dataset_id: datasetId
        }).toArray();

        // Enrich with voter information
        const enrichedVotes = await Promise.all(
            votes.map(async (vote) => {
                const voter = await db.collection('users').findOne(
                    { user_id: vote.voter_user_id },
                    { projection: { username: 1, full_name: 1 } }
                );

                return {
                    vote_id: vote.vote_id,
                    rating: vote.rating,
                    voter: voter ? {
                        username: voter.username,
                        fullName: voter.full_name
                    } : null,
                    created_at: vote.created_at
                };
            })
        );

        // Get total count from Redis
        const totalVotes = await getCounter(`vote_count:dataset:${datasetId}`);

        // Calculate average rating
        const avgRating = votes.length > 0
            ? votes.reduce((sum, v) => sum + v.rating, 0) / votes.length
            : 0;

        res.json({
            success: true,
            count: enrichedVotes.length,
            totalVotes: totalVotes || 0,
            averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            votes: enrichedVotes
        });

    } catch (error) {
        console.error('Error getting votes:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU17 - Check if current user voted on dataset
 * GET /api/datasets/:datasetId/votes/me
 * 
 * Returns current user's vote if exists
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserVote(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;

        const vote = await db.collection('votes').findOne({
            target_dataset_id: datasetId,
            voter_user_id: req.user.userId
        });

        if (!vote) {
            return res.json({
                success: true,
                hasVoted: false,
                vote: null
            });
        }

        res.json({
            success: true,
            hasVoted: true,
            vote: {
                vote_id: vote.vote_id,
                rating: vote.rating,
                created_at: vote.created_at
            }
        });

    } catch (error) {
        console.error('Error checking user vote:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    addVote,        // HU17
    removeVote,     // HU17
    getVotes,       // HU17
    getUserVote     // HU17
};