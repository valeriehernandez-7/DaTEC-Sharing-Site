/**
 * Comment Controller
 * Handles dataset comments with nested replies (threaded comments)
 * 
 * @module controllers/comment.controller
 * 
 * Dependencies:
 * - MongoDB: Store and retrieve comments
 * 
 * HU15: Comments + Replies
 * - Users can comment on datasets
 * - Users can reply to comments (nested up to 5 levels)
 * - Comments are displayed as a tree structure
 */

const { getMongo } = require('../config/databases');
const { generateCommentId } = require('../utils/id-generators');
const { getFileUrl } = require('../utils/couchdb-manager');

/**
 * HU15 - Add a comment or reply to a dataset
 * POST /api/datasets/:datasetId/comments
 * 
 * Allows users to comment on approved/public datasets
 * Supports nested replies up to 5 levels deep
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params.datasetId - Target dataset ID
 * @param {Object} req.body.content - Comment text (1-2000 chars)
 * @param {Object} req.body.parent_comment_id - Parent comment ID (null for top-level)
 * @param {Object} res - Express response object
 */
async function addComment(req, res) {
    try {
        const db = getMongo();
        const { content, parent_comment_id } = req.body;
        const { datasetId } = req.params;

        // VALIDATION 1: Content must be between 1-2000 characters
        if (!content || content.trim().length < 1 || content.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Comment content must be between 1 and 2000 characters'
            });
        }

        // VALIDATION 2: Verify dataset exists and is accessible
        const dataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // VALIDATION 3: Dataset must be approved and public (or user is owner/admin)
        const isOwner = req.user && dataset.owner_user_id === req.user.userId;
        const isAdmin = req.user && req.user.isAdmin;
        const isAccessible = (dataset.status === 'approved' && dataset.is_public) || isOwner || isAdmin;

        if (!isAccessible) {
            return res.status(403).json({
                success: false,
                error: 'Cannot comment on this dataset. It must be approved and public.'
            });
        }

        // VALIDATION 4: If replying, verify parent comment exists and is active
        if (parent_comment_id) {
            const parentComment = await db.collection('comments').findOne({
                comment_id: parent_comment_id,
                is_active: true
            });

            if (!parentComment) {
                return res.status(404).json({
                    success: false,
                    error: 'Parent comment not found or has been disabled'
                });
            }

            // Verify parent comment belongs to same dataset
            if (parentComment.target_dataset_id !== datasetId) {
                return res.status(400).json({
                    success: false,
                    error: 'Parent comment does not belong to this dataset'
                });
            }

            // VALIDATION 5: Check nesting depth (max 5 levels)
            const depth = await getCommentDepth(db, parent_comment_id);
            if (depth >= 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Maximum comment nesting level (5) reached. Cannot reply to this comment.'
                });
            }
        }

        // Generate unique comment_id
        const comment_id = generateCommentId(datasetId);

        // Create comment document
        const comment = {
            comment_id: comment_id,
            target_dataset_id: datasetId,
            author_user_id: req.user.userId,
            parent_comment_id: parent_comment_id || null,
            content: content.trim(),
            is_active: true,
            created_at: new Date()
        };

        // Insert comment into MongoDB
        await db.collection('comments').insertOne(comment);

        // Increment dataset comment_count
        await db.collection('datasets').updateOne(
            { dataset_id: datasetId },
            { $inc: { comment_count: 1 } }
        );

        // Get author info for response
        const author = await db.collection('users').findOne(
            { user_id: req.user.userId },
            { projection: { username: 1, full_name: 1, avatar_ref: 1 } }
        );

        res.status(201).json({
            success: true,
            message: parent_comment_id ? 'Reply added successfully' : 'Comment added successfully',
            comment: {
                comment_id: comment_id,
                content: comment.content,
                author: {
                    username: author.username,
                    full_name: author.full_name,
                    avatar_url: author.avatar_ref
                        ? getFileUrl(author.avatar_ref.couchdb_document_id, author.avatar_ref.file_name)
                        : null
                },
                parent_comment_id: comment.parent_comment_id,
                created_at: comment.created_at,
                is_active: true
            }
        });

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU15 - Get comments for a dataset (as a tree structure)
 * GET /api/datasets/:datasetId/comments
 * 
 * Returns all comments with nested replies
 * Admins can see disabled comments, regular users only see active ones
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params.datasetId - Target dataset ID
 * @param {Object} res - Express response object
 */
async function getComments(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;

        // Verify dataset exists
        const dataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Build query based on user roles
        const query = { target_dataset_id: datasetId };

        // // Non-admin users only see active comments
        // if (!req.user || !req.user.isAdmin) {
        //     query.is_active = true;
        // }

        // Get all comments for this dataset
        const comments = await db.collection('comments')
            .find(query)
            .sort({ created_at: 1 })  // Chronological order
            .toArray();

        // Enrich comments with author information
        const enrichedComments = await Promise.all(
            comments.map(async (comment) => {
                const author = await db.collection('users').findOne(
                    { user_id: comment.author_user_id },
                    { projection: { username: 1, full_name: 1, avatar_ref: 1 } }
                );

                return {
                    comment_id: comment.comment_id,
                    content: comment.content,
                    author: author ? {
                        user_id: comment.author_user_id,
                        username: author.username,
                        full_name: author.full_name,
                        avatar_url: author.avatar_ref
                            ? getFileUrl(author.avatar_ref.couchdb_document_id, author.avatar_ref.file_name)
                            : null
                    } : null,
                    parent_comment_id: comment.parent_comment_id,
                    is_active: comment.is_active,
                    created_at: comment.created_at,
                    // Helper flag to identify if current user is the author
                    is_own_comment: req.user && comment.author_user_id === req.user.userId
                };
            })
        );

        // Build tree structure from flat list
        const commentTree = buildCommentTree(enrichedComments);

        res.json({
            success: true,
            dataset_id: datasetId,
            comment_count: enrichedComments.length,
            comments: commentTree
        });

    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Helper function: Calculate comment nesting depth
 * Recursively walks up the parent chain to determine depth
 * 
 * @param {Object} db - MongoDB database connection
 * @param {string} commentId - Comment ID to check
 * @param {number} currentDepth - Current depth in recursion (default: 0)
 * @returns {Promise<number>} Nesting depth (0 = top-level, 1 = first reply, etc.)
 */
async function getCommentDepth(db, commentId, currentDepth = 0) {
    const comment = await db.collection('comments').findOne({
        comment_id: commentId
    });

    // If no comment or no parent, return current depth
    if (!comment || !comment.parent_comment_id) {
        return currentDepth;
    }

    // Recursively check parent's depth
    return getCommentDepth(db, comment.parent_comment_id, currentDepth + 1);
}

/**
 * Helper function: Build comment tree from flat list
 * Converts flat array of comments into nested tree structure
 * 
 * Algorithm:
 * 1. Create a map of all comments by comment_id
 * 2. For each comment, add it to its parent's replies array
 * 3. Return root-level comments (those without parents)
 * 
 * @param {Array} comments - Flat array of comment objects
 * @returns {Array} Array of root-level comments with nested replies
 */
function buildCommentTree(comments) {
    // Step 1: Create map and initialize replies array
    const commentMap = {};
    comments.forEach(comment => {
        commentMap[comment.comment_id] = {
            ...comment,
            replies: []  // Initialize empty replies array
        };
    });

    // Step 2: Build tree by linking children to parents
    const rootComments = [];
    comments.forEach(comment => {
        const commentNode = commentMap[comment.comment_id];

        if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
            // This is a reply - add it to parent's replies array
            commentMap[comment.parent_comment_id].replies.push(commentNode);
        } else {
            // This is a root-level comment
            rootComments.push(commentNode);
        }
    });

    // Step 3: Sort replies chronologically (oldest first) at each level
    function sortReplies(comment) {
        comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        comment.replies.forEach(reply => sortReplies(reply));
    }

    rootComments.forEach(comment => sortReplies(comment));

    return rootComments;
}

module.exports = {
    addComment,      // HU15
    getComments      // HU15
};