/**
 * Dataset Controller
 * Handles dataset operations across 4 databases
 * HU5, HU6, HU7, HU9, HU10, HU11, HU12, HU13, HU18
 * 
 * @module controllers/dataset.controller
 * 
 * Database Operations:
 * - MongoDB: Dataset metadata
 * - CouchDB: File storage (data files, header photos)
 * - Neo4j: Dataset nodes
 * - Redis: Counters (downloads, votes)
 */

const { getMongo } = require('../config/databases');
const { uploadFile, deleteFile, getFileUrl, getFile } = require('../utils/couchdb-manager');
const {
    generateDatasetId,
    generateDatasetFileDocId,
    generateHeaderPhotoDocId
} = require('../utils/id-generators');
const { datasetCreateSchema } = require('../utils/validators');
const { initCounter, getCounter } = require('../utils/redis-counters');
const { createDatasetNode, deleteNode } = require('../utils/neo4j-relations');

/**
 * HU5 - Create new dataset
 * POST /api/datasets
 * 
 * Requires: Authentication
 * Body: dataset_name, description, tags (optional), tutorial_video_url (optional)
 * Files: data_files (required, max 10), header_photo (optional)
 * 
 * Databases affected: MongoDB, CouchDB, Neo4j, Redis
 */
async function createDataset(req, res) {
    try {
        const db = getMongo();

        // Validate request body
        const { error, value } = datasetCreateSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        // Validate that at least one data file is provided
        if (!req.files || !req.files.data_files || req.files.data_files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one data file is required'
            });
        }

        const { dataset_name, description, tags, tutorial_video_url } = value;

        // Normalize dataset name: replace spaces with hyphens, convert to lowercase
        const normalizedName = dataset_name.trim().replace(/\s+/g, '-').toLowerCase();

        // Check if user already has a dataset with this normalized name
        const existingDataset = await db.collection('datasets').findOne({
            owner_user_id: req.user.userId,
            dataset_name: normalizedName
        });

        if (existingDataset) {
            return res.status(409).json({
                success: false,
                error: 'You already have a dataset with this name'
            });
        }

        // Generate unique dataset ID
        const dataset_id = await generateDatasetId(req.user.username);

        // Upload data files to CouchDB
        const file_references = [];
        for (let i = 0; i < req.files.data_files.length; i++) {
            const file = req.files.data_files[i];
            const docId = generateDatasetFileDocId(dataset_id, i + 1);

            const fileRef = await uploadFile(docId, file, {
                type: 'dataset_file',
                owner_user_id: req.user.userId,
                dataset_id: dataset_id,
                file_index: i + 1,
                uploaded_at: new Date().toISOString()
            });

            file_references.push({
                ...fileRef,
                uploaded_at: new Date()
            });
        }

        // Upload header photo if provided (optional)
        let header_photo_ref = null;
        if (req.files.header_photo && req.files.header_photo[0]) {
            const docId = generateHeaderPhotoDocId(dataset_id);
            header_photo_ref = await uploadFile(
                docId,
                req.files.header_photo[0],
                {
                    type: 'header_photo',
                    owner_user_id: req.user.userId,
                    dataset_id: dataset_id,
                    uploaded_at: new Date().toISOString()
                }
            );
        }

        // Parse video URL if provided (HU11)
        let tutorial_video_ref = null;
        if (tutorial_video_url) {
            const platform = tutorial_video_url.includes('youtube') || tutorial_video_url.includes('youtu.be') ? 'youtube' :
                tutorial_video_url.includes('vimeo') ? 'vimeo' : 'other';

            tutorial_video_ref = {
                url: tutorial_video_url,
                platform: platform
            };
        }

        // Create dataset document in MongoDB
        const dataset = {
            dataset_id: dataset_id,
            owner_user_id: req.user.userId,
            parent_dataset_id: null,
            dataset_name: normalizedName,  // Use normalized name
            description: description,
            tags: tags || [],
            status: 'pending',
            reviewed_at: null,
            admin_review: null,
            is_public: false,
            file_references: file_references,
            header_photo_ref: header_photo_ref,
            tutorial_video_ref: tutorial_video_ref,
            download_count: 0,
            vote_count: 0,
            comment_count: 0,
            created_at: new Date(),
            updated_at: new Date()
        };

        await db.collection('datasets').insertOne(dataset);

        // Create dataset node in Neo4j
        await createDatasetNode(dataset_id, normalizedName);  // Use normalized name

        // Initialize counters in Redis
        await initCounter(`download_count:dataset:${dataset_id}`, 0);
        await initCounter(`vote_count:dataset:${dataset_id}`, 0);

        res.status(201).json({
            success: true,
            message: 'Dataset created successfully',
            dataset: {
                dataset_id: dataset_id,
                dataset_name: normalizedName,  // Return normalized name
                status: 'pending',
                file_count: file_references.length
            }
        });

    } catch (error) {
        console.error('Error creating dataset:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU9 - Search datasets
 * GET /api/datasets/search?q=query
 * 
 * Searches by dataset name, description, and tags
 * Only returns approved and public datasets
 */
async function searchDatasets(req, res) {
    try {
        const db = getMongo();
        const query = req.query.q;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter required'
            });
        }

        // Use regex for partial matching (case-insensitive)
        const searchRegex = new RegExp(query, 'i');

        const datasets = await db.collection('datasets').find({
            status: 'approved',
            is_public: true,
            $or: [
                { dataset_name: searchRegex },
                { description: searchRegex },
                { tags: searchRegex }
            ]
        }).limit(20).toArray();

        // Enrich with owner information and real-time counters
        const enrichedDatasets = await Promise.all(
            datasets.map(async (dataset) => {
                const owner = await db.collection('users').findOne(
                    { user_id: dataset.owner_user_id },
                    { projection: { username: 1, full_name: 1, avatar_ref: 1 } }
                );

                // Get real-time counters from Redis
                const downloadCount = await getCounter(`download_count:dataset:${dataset.dataset_id}`);
                const voteCount = await getCounter(`vote_count:dataset:${dataset.dataset_id}`);

                return {
                    dataset_id: dataset.dataset_id,
                    dataset_name: dataset.dataset_name,
                    description: dataset.description,
                    tags: dataset.tags,
                    owner: owner ? {
                        username: owner.username,
                        fullName: owner.full_name,
                        avatarUrl: owner.avatar_ref
                            ? getFileUrl(owner.avatar_ref.couchdb_document_id, owner.avatar_ref.file_name)
                            : null,
                    } : null,
                    header_photo_url: dataset.header_photo_ref
                        ? getFileUrl(dataset.header_photo_ref.couchdb_document_id, dataset.header_photo_ref.file_name)
                        : null,
                    file_count: dataset.file_references.length,
                    download_count: downloadCount || 0,
                    vote_count: voteCount || 0,
                    comment_count: dataset.comment_count || 0,
                    created_at: dataset.created_at,
                    updated_at: dataset.updated_at
                };
            })
        );

        res.json({
            success: true,
            count: enrichedDatasets.length,
            datasets: enrichedDatasets
        });

    } catch (error) {
        console.error('Error searching datasets:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU10 - Get dataset details
 * GET /api/datasets/:datasetId
 * 
 * Returns complete dataset information including file sizes
 * Only approved and public datasets are accessible (unless owner or admin)
 */
async function getDataset(req, res) {
    try {
        const db = getMongo();
        const dataset = await db.collection('datasets').findOne({
            dataset_id: req.params.datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Check access permissions
        const isOwner = req.user && req.user.userId === dataset.owner_user_id;
        const isAdmin = req.user && req.user.isAdmin;
        const isPublic = dataset.status === 'approved' && dataset.is_public;

        if (!isPublic && !isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access denied: Dataset is not public'
            });
        }

        // Get owner information
        const owner = await db.collection('users').findOne(
            { user_id: dataset.owner_user_id },
            { projection: { username: 1, full_name: 1, avatar_ref: 1 } }
        );

        // Get real-time counters from Redis
        const downloadCount = await getCounter(`download_count:dataset:${dataset.dataset_id}`);
        const voteCount = await getCounter(`vote_count:dataset:${dataset.dataset_id}`);

        res.json({
            success: true,
            dataset: {
                dataset_id: dataset.dataset_id,
                dataset_name: dataset.dataset_name,
                description: dataset.description,
                tags: dataset.tags,
                status: dataset.status,
                is_public: dataset.is_public,
                parent_dataset_id: dataset.parent_dataset_id,
                owner: owner ? {
                    user_id: owner.user_id,
                    username: owner.username,
                    fullName: owner.full_name,
                    avatarUrl: owner.avatar_ref
                        ? getFileUrl(owner.avatar_ref.couchdb_document_id, owner.avatar_ref.file_name)
                        : null
                } : null,
                files: dataset.file_references.map(file => ({
                    file_name: file.file_name,
                    file_size_bytes: file.file_size_bytes,
                    mime_type: file.mime_type,
                    download_url: getFileUrl(file.couchdb_document_id, file.file_name)
                })),
                header_photo_url: dataset.header_photo_ref
                    ? getFileUrl(dataset.header_photo_ref.couchdb_document_id, dataset.header_photo_ref.file_name)
                    : null,
                tutorial_video: dataset.tutorial_video_ref,
                download_count: downloadCount,
                vote_count: voteCount,
                comment_count: dataset.comment_count,
                created_at: dataset.created_at,
                updated_at: dataset.updated_at,
                reviewed_at: dataset.reviewed_at,
                admin_review: dataset.admin_review
            }
        });

    } catch (error) {
        console.error('Error getting dataset:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU12 - Get user's datasets
 * GET /api/datasets/user/:username
 * 
 * Returns all datasets from a specific user
 * Privacy: Only shows public datasets unless viewing own profile
 */
async function getUserDatasets(req, res) {
    try {
        const db = getMongo();

        // Get target user
        const targetUser = await db.collection('users').findOne({
            username: req.params.username
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if viewing own profile
        const isOwnProfile = req.user && req.user.userId === targetUser.user_id;
        const isAdmin = req.user && req.user.isAdmin;

        // Build query filter
        const filter = { owner_user_id: targetUser.user_id };

        // Only show public datasets unless owner or admin
        if (!isOwnProfile && !isAdmin) {
            filter.status = 'approved';
            filter.is_public = true;
        }

        const datasets = await db.collection('datasets')
            .find(filter)
            .sort({ created_at: -1 })
            .toArray();

        // Enrich datasets with real-time counters from Redis
        const enrichedDatasets = await Promise.all(
            datasets.map(async (dataset) => {
                // Get real-time counters from Redis
                const downloadCount = await getCounter(`download_count:dataset:${dataset.dataset_id}`);
                const voteCount = await getCounter(`vote_count:dataset:${dataset.dataset_id}`);

                return {
                    dataset_id: dataset.dataset_id,
                    dataset_name: dataset.dataset_name,
                    description: dataset.description,
                    tags: dataset.tags,
                    status: dataset.status,
                    is_public: dataset.is_public,
                    header_photo_url: dataset.header_photo_ref
                        ? getFileUrl(dataset.header_photo_ref.couchdb_document_id, dataset.header_photo_ref.file_name)
                        : null,
                    file_count: dataset.file_references.length,
                    download_count: downloadCount || 0,
                    vote_count: voteCount || 0,
                    comment_count: dataset.comment_count || 0,
                    created_at: dataset.created_at,
                    updated_at: dataset.updated_at
                };
            })
        );

        res.json({
            success: true,
            count: enrichedDatasets.length,
            username: targetUser.username,
            datasets: enrichedDatasets
        });

    } catch (error) {
        console.error('Error getting user datasets:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU6 - Request dataset approval
 * PATCH /api/datasets/:datasetId/review-request
 * 
 * Changes dataset status to 'pending' for admin review
 * Only owner can request approval
 */
async function requestApproval(req, res) {
    try {
        const db = getMongo();
        const dataset = await db.collection('datasets').findOne({
            dataset_id: req.params.datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Only owner can request approval
        if (dataset.owner_user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Only dataset owner can request approval'
            });
        }

        // Dataset must NOT be already pending or approved
        if (dataset.status === 'pending') {
            return res.status(400).json({
                success: false,
                error: 'Dataset is already pending approval'
            });
        }

        if (dataset.status === 'approved') {
            return res.status(400).json({
                success: false,
                error: 'Dataset is already approved'
            });
        }

        // Update dataset status to pending
        await db.collection('datasets').updateOne(
            { dataset_id: req.params.datasetId },
            {
                $set: {
                    status: 'pending',
                    updated_at: new Date()
                }
            }
        );

        res.json({
            success: true,
            message: 'Dataset submitted for admin review. An administrator will review it soon.',
            status: 'pending'
        });

    } catch (error) {
        console.error('Error requesting approval:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU7 - Toggle dataset visibility (public/private)
 * PATCH /api/datasets/:datasetId/visibility
 * 
 * Body: { is_public: true/false }
 * Only owner can change visibility
 * Only approved datasets can be made public
 * HU19 - Notifies followers when dataset becomes public
 */
async function toggleVisibility(req, res) {
    try {
        const db = getMongo();
        const dataset = await db.collection('datasets').findOne({
            dataset_id: req.params.datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Only owner can change visibility
        if (dataset.owner_user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Only dataset owner can change visibility'
            });
        }

        // Can only make approved datasets public
        if (dataset.status !== 'approved' && req.body.is_public === true) {
            return res.status(400).json({
                success: false,
                error: 'Only approved datasets can be made public'
            });
        }

        const newVisibility = req.body.is_public === true;
        const wasPrivate = dataset.is_public === false;

        await db.collection('datasets').updateOne(
            { dataset_id: req.params.datasetId },
            {
                $set: {
                    is_public: newVisibility,
                    updated_at: new Date()
                }
            }
        );

        // HU19: If changing from private to public, notify all followers
        if (wasPrivate && newVisibility === true) {
            try {
                const { broadcastNotification } = require('../utils/notifications');
                const { getFollowersIds } = require('../utils/neo4j-relations');

                // Get all followers of the dataset owner
                const followerIds = await getFollowersIds(dataset.owner_user_id);

                if (followerIds && followerIds.length > 0) {
                    // Broadcast notification to all followers
                    const notifiedCount = await broadcastNotification(followerIds, {
                        type: 'new_dataset',
                        from_user_id: dataset.owner_user_id,
                        from_username: req.user.username,
                        dataset_id: dataset.dataset_id,
                        dataset_name: dataset.dataset_name,
                        timestamp: new Date().toISOString()
                    });

                    // console.log(`Notified ${notifiedCount} followers about new public dataset`);
                }
            } catch (notifError) {
                console.error('Failed to notify followers:', notifError.message);
                // Don't fail the request if notifications fail
            }
        }

        res.json({
            success: true,
            message: `Dataset is now ${newVisibility ? 'public' : 'private'}`,
            is_public: newVisibility
        });

    } catch (error) {
        console.error('Error toggling visibility:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Update dataset information and files
 * PATCH /api/datasets/:datasetId
 * 
 * Allows dataset owner to update dataset metadata, files, and media
 * Supports partial updates (only provided fields are modified)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateDataset(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;

        // Validate request body
        const { error, value } = datasetUpdateSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const { dataset_name, description, tags, tutorial_video_url, is_public } = value;

        let filesToDelete = [];
        if (req.body.files_to_delete) {
            try {
                filesToDelete = JSON.parse(req.body.files_to_delete);
            } catch (error) {
                console.warn('Failed to parse files_to_delete:', error);
                filesToDelete = [];
            }
        }

        // Get existing dataset
        const dataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Verify user is the owner
        if (dataset.owner_user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Only dataset owner can update dataset'
            });
        }

        const updates = {};
        const normalizedName = dataset_name ? dataset_name.trim().replace(/\s+/g, '-').toLowerCase() : null;

        // Validate new dataset name if changing
        if (normalizedName && normalizedName !== dataset.dataset_name) {
            const existingDataset = await db.collection('datasets').findOne({
                owner_user_id: req.user.userId,
                dataset_name: normalizedName
            });

            if (existingDataset) {
                return res.status(409).json({
                    success: false,
                    error: 'You already have a dataset with this name'
                });
            }
            updates.dataset_name = normalizedName;
        }

        // Update basic fields if provided
        if (description) updates.description = description;
        if (tags) updates.tags = tags;
        if (is_public !== undefined) updates.is_public = is_public;

        // Handle file deletions
        if (filesToDelete.length > 0) {
            const updatedFileReferences = dataset.file_references.filter(
                file => !filesToDelete.includes(file.couchdb_document_id)
            );

            // Delete files from CouchDB
            for (const fileId of filesToDelete) {
                try {
                    await deleteFile(fileId);
                } catch (error) {
                    console.warn(`Failed to delete file ${fileId}:`, error.message);
                }
            }

            updates.file_references = updatedFileReferences;
        }

        // Handle new file uploads
        if (req.files && req.files.data_files) {
            const currentFiles = updates.file_references || dataset.file_references;

            // Check if adding new files would exceed the limit
            if (currentFiles.length + req.files.data_files.length > 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot exceed maximum of 10 files per dataset'
                });
            }

            const newFileReferences = [...currentFiles];
            let nextFileIndex = newFileReferences.length + 1;

            for (let i = 0; i < req.files.data_files.length; i++) {
                const file = req.files.data_files[i];
                const docId = generateDatasetFileDocId(datasetId, nextFileIndex);

                const fileRef = await uploadFile(docId, file, {
                    type: 'dataset_file',
                    owner_user_id: req.user.userId,
                    dataset_id: datasetId,
                    file_index: nextFileIndex,
                    uploaded_at: new Date().toISOString()
                });

                newFileReferences.push({
                    ...fileRef,
                    uploaded_at: new Date()
                });

                nextFileIndex++;
            }

            updates.file_references = newFileReferences;
        }

        // Handle header photo update
        if (req.files && req.files.header_photo) {
            // Delete old header photo if exists
            if (dataset.header_photo_ref) {
                try {
                    await deleteFile(dataset.header_photo_ref.couchdb_document_id);
                } catch (error) {
                    console.warn('Failed to delete old header photo:', error.message);
                }
            }

            // Upload new header photo
            const docId = generateHeaderPhotoDocId(datasetId);
            updates.header_photo_ref = await uploadFile(
                docId,
                req.files.header_photo[0],
                {
                    type: 'header_photo',
                    owner_user_id: req.user.userId,
                    dataset_id: datasetId,
                    uploaded_at: new Date().toISOString()
                }
            );
        } else if (req.body.header_photo === null && dataset.header_photo_ref) {
            // Delete header photo if explicitly set to null
            try {
                await deleteFile(dataset.header_photo_ref.couchdb_document_id);
                updates.header_photo_ref = null;
            } catch (error) {
                console.warn('Failed to delete header photo:', error.message);
            }
        }

        // Handle tutorial video update
        if (tutorial_video_url !== undefined) {
            if (tutorial_video_url === null || tutorial_video_url === '') {
                updates.tutorial_video_ref = null;
            } else {
                const platform = tutorial_video_url.includes('youtube') || tutorial_video_url.includes('youtu.be') ? 'youtube' :
                    tutorial_video_url.includes('vimeo') ? 'vimeo' : 'other';

                updates.tutorial_video_ref = {
                    url: tutorial_video_url,
                    platform: platform
                };
            }
        }

        // Only proceed if there are actual updates
        if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date();

            await db.collection('datasets').updateOne(
                { dataset_id: datasetId },
                { $set: updates }
            );
        }

        // Get updated dataset
        const updatedDataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        // Enrich with owner information
        const owner = await db.collection('users').findOne(
            { user_id: updatedDataset.owner_user_id },
            { projection: { username: 1, full_name: 1, avatar_ref: 1 } }
        );

        res.json({
            success: true,
            message: 'Dataset updated successfully',
            dataset: {
                dataset_id: updatedDataset.dataset_id,
                dataset_name: updatedDataset.dataset_name,
                description: updatedDataset.description,
                tags: updatedDataset.tags,
                status: updatedDataset.status,
                is_public: updatedDataset.is_public,
                owner: owner ? {
                    username: owner.username,
                    fullName: owner.full_name,
                    avatarUrl: owner.avatar_ref
                        ? getFileUrl(owner.avatar_ref.couchdb_document_id, owner.avatar_ref.file_name)
                        : null
                } : null,
                files: updatedDataset.file_references.map(file => ({
                    file_name: file.file_name,
                    file_size_bytes: file.file_size_bytes,
                    mime_type: file.mime_type,
                    download_url: getFileUrl(file.couchdb_document_id, file.file_name)
                })),
                header_photo_url: updatedDataset.header_photo_ref
                    ? getFileUrl(updatedDataset.header_photo_ref.couchdb_document_id, updatedDataset.header_photo_ref.file_name)
                    : null,
                tutorial_video: updatedDataset.tutorial_video_ref,
                download_count: updatedDataset.download_count,
                vote_count: updatedDataset.vote_count,
                comment_count: updatedDataset.comment_count,
                created_at: updatedDataset.created_at,
                updated_at: updatedDataset.updated_at
            }
        });

    } catch (error) {
        console.error('Error updating dataset:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU7 - Delete dataset
 * DELETE /api/datasets/:datasetId
 * 
 * Permanently deletes dataset from all 4 databases
 * Only owner or admin can delete
 */
async function deleteDataset(req, res) {
    try {
        const db = getMongo();
        const dataset = await db.collection('datasets').findOne({
            dataset_id: req.params.datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Only owner or admin can delete
        const isOwner = req.user.userId === dataset.owner_user_id;
        const isAdmin = req.user.isAdmin;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Only owner or admin can delete dataset'
            });
        }

        const datasetId = req.params.datasetId;

        // Delete files from CouchDB
        for (const fileRef of dataset.file_references) {
            try {
                await deleteFile(fileRef.couchdb_document_id);
            } catch (error) {
                console.warn(`Failed to delete file ${fileRef.couchdb_document_id}:`, error.message);
            }
        }

        // Delete header photo if exists
        if (dataset.header_photo_ref) {
            try {
                await deleteFile(dataset.header_photo_ref.couchdb_document_id);
            } catch (error) {
                console.warn('Failed to delete header photo:', error.message);
            }
        }

        // Delete from MongoDB
        await db.collection('datasets').deleteOne({ dataset_id: datasetId });

        // Also delete related votes and comments
        await db.collection('votes').deleteMany({ dataset_id: datasetId });
        await db.collection('comments').deleteMany({ dataset_id: datasetId });

        // Delete Neo4j node (DETACH DELETE removes relationships too)
        await deleteNode(datasetId, 'Dataset');

        // Delete Redis counters
        const { getRedis } = require('../config/databases');
        const { primary } = getRedis();
        await primary.del(`download_count:dataset:${datasetId}`);
        await primary.del(`vote_count:dataset:${datasetId}`);

        res.json({
            success: true,
            message: 'Dataset deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting dataset:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU18 - Clone dataset
 * POST /api/datasets/:datasetId/clone
 * 
 * Creates a complete copy of an approved dataset
 * Can clone your OWN dataset as long as you give it a different name
 * Can clone OTHER users' datasets only if they are public
 * Duplicates all files in CouchDB with new document IDs
 * Creates new entries in all 4 databases
 * 
 * Body: { new_dataset_name: "Different Name" }
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function cloneDataset(req, res) {
    try {
        const db = getMongo();
        const originalDataset = await db.collection('datasets').findOne({
            dataset_id: req.params.datasetId
        });

        if (!originalDataset) {
            return res.status(404).json({
                success: false,
                error: 'Original dataset not found'
            });
        }

        // HU18: Only approved datasets can be cloned
        if (originalDataset.status !== 'approved') {
            return res.status(403).json({
                success: false,
                error: 'Can only clone approved datasets'
            });
        }

        // HU18: Must provide new dataset name
        if (!req.body.new_dataset_name || req.body.new_dataset_name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'New dataset name is required for cloning'
            });
        }

        // Normalize the new dataset name (same as createDataset)
        const newName = req.body.new_dataset_name.trim().replace(/\s+/g, '-').toLowerCase();

        // Check if user already has a dataset with this name
        const existingDataset = await db.collection('datasets').findOne({
            owner_user_id: req.user.userId,
            dataset_name: newName
        });

        if (existingDataset) {
            // If it's the same dataset being cloned, name must be different
            if (existingDataset.dataset_id === req.params.datasetId) {
                return res.status(400).json({
                    success: false,
                    error: 'New dataset name must be different from original'
                });
            }
            // If it's a different dataset with same name, conflict
            return res.status(409).json({
                success: false,
                error: 'You already have a dataset with this name'
            });
        }

        // If cloning someone else's dataset, it must be public
        if (originalDataset.owner_user_id !== req.user.userId && !originalDataset.is_public) {
            return res.status(403).json({
                success: false,
                error: 'Can only clone public datasets from other users'
            });
        }

        // Generate new dataset ID for clone
        const clonedDatasetId = await generateDatasetId(req.user.username);

        // Clone files in CouchDB
        const clonedFileReferences = [];
        for (let i = 0; i < originalDataset.file_references.length; i++) {
            const originalFile = originalDataset.file_references[i];
            const newDocId = generateDatasetFileDocId(clonedDatasetId, i + 1);

            try {
                // Get original file from CouchDB
                let fileData = await getFile(
                    originalFile.couchdb_document_id,
                    originalFile.file_name
                );

                // Ensure we have a Buffer (getFile might return Buffer or other types)
                let fileBuffer;
                if (Buffer.isBuffer(fileData)) {
                    fileBuffer = fileData;
                } else if (typeof fileData === 'string') {
                    fileBuffer = Buffer.from(fileData, 'utf8');
                } else if (typeof fileData === 'object') {
                    fileBuffer = Buffer.from(JSON.stringify(fileData), 'utf8');
                } else {
                    fileBuffer = Buffer.from(fileData);
                }

                // Upload as new file
                const clonedFileRef = await uploadFile(newDocId, {
                    buffer: fileBuffer,
                    originalname: originalFile.file_name,
                    mimetype: originalFile.mime_type,
                    size: fileBuffer.length  // Use actual buffer length
                }, {
                    type: 'dataset_file',
                    owner_user_id: req.user.userId,
                    dataset_id: clonedDatasetId,
                    file_index: i + 1,
                    cloned_from: originalFile.couchdb_document_id,
                    uploaded_at: new Date().toISOString()
                });

                clonedFileReferences.push({
                    ...clonedFileRef,
                    uploaded_at: new Date()
                });
            } catch (error) {
                console.error(`Failed to clone file ${originalFile.file_name}:`, error.message);
                throw new Error(`Failed to clone file: ${originalFile.file_name}`);
            }
        }

        // Clone header photo if exists
        let clonedHeaderPhotoRef = null;
        if (originalDataset.header_photo_ref) {
            const newDocId = generateHeaderPhotoDocId(clonedDatasetId);

            try {
                // Get original header photo
                let photoData = await getFile(
                    originalDataset.header_photo_ref.couchdb_document_id,
                    originalDataset.header_photo_ref.file_name
                );

                // Ensure we have a Buffer (getFile might return Buffer or other types)
                let photoBuffer;
                if (Buffer.isBuffer(photoData)) {
                    photoBuffer = photoData;
                } else if (typeof photoData === 'string') {
                    photoBuffer = Buffer.from(photoData, 'utf8');
                } else if (typeof photoData === 'object') {
                    photoBuffer = Buffer.from(JSON.stringify(photoData), 'utf8');
                } else {
                    photoBuffer = Buffer.from(photoData);
                }

                clonedHeaderPhotoRef = await uploadFile(newDocId, {
                    buffer: photoBuffer,
                    originalname: originalDataset.header_photo_ref.file_name,
                    mimetype: originalDataset.header_photo_ref.mime_type,
                    size: photoBuffer.length  // Use actual buffer length
                }, {
                    type: 'header_photo',
                    owner_user_id: req.user.userId,
                    dataset_id: clonedDatasetId,
                    cloned_from: originalDataset.header_photo_ref.couchdb_document_id,
                    uploaded_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('Failed to clone header photo:', error.message);
                // Header photo is optional, continue without it
                clonedHeaderPhotoRef = null;
            }
        }

        // Create cloned dataset in MongoDB
        const clonedDataset = {
            dataset_id: clonedDatasetId,
            owner_user_id: req.user.userId,
            parent_dataset_id: req.params.datasetId,
            dataset_name: newName,
            description: originalDataset.description,
            tags: [...originalDataset.tags],
            status: 'pending',
            reviewed_at: null,
            admin_review: null,
            is_public: false,
            file_references: clonedFileReferences,
            header_photo_ref: clonedHeaderPhotoRef,
            tutorial_video_ref: originalDataset.tutorial_video_ref
                ? { ...originalDataset.tutorial_video_ref }
                : null,
            download_count: 0,
            vote_count: 0,
            comment_count: 0,
            created_at: new Date(),
            updated_at: new Date()
        };

        await db.collection('datasets').insertOne(clonedDataset);

        // Create dataset node in Neo4j
        await createDatasetNode(clonedDatasetId, newName);

        // Initialize counters in Redis
        await initCounter(`download_count:dataset:${clonedDatasetId}`, 0);
        await initCounter(`vote_count:dataset:${clonedDatasetId}`, 0);

        res.status(201).json({
            success: true,
            message: 'Dataset cloned successfully',
            dataset: {
                dataset_id: clonedDatasetId,
                dataset_name: newName,
                parent_dataset_id: req.params.datasetId,
                status: 'pending',
                file_count: clonedFileReferences.length
            }
        });

    } catch (error) {
        console.error('Error cloning dataset:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Get all clones of a dataset
 * GET /api/datasets/:datasetId/clones
 * 
 * Returns list of datasets that were cloned from this dataset
 * Public endpoint - any user can see clones
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDatasetClones(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;

        // Verify dataset exists
        const originalDataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!originalDataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Find all datasets that have this dataset as parent
        const cloneDatasets = await db.collection('datasets').find({
            parent_dataset_id: datasetId
        }).sort({ created_at: -1 }).toArray();

        // Enrich with owner information
        const enrichedClones = await Promise.all(
            cloneDatasets.map(async (clone) => {
                const owner = await db.collection('users').findOne(
                    { user_id: clone.owner_user_id },
                    { projection: { username: 1, full_name: 1 , avatar_ref: 1 } }
                );

                return {
                    dataset_id: clone.dataset_id,
                    dataset_name: clone.dataset_name,
                    owner: owner ? {
                        username: owner.username,
                        fullName: owner.full_name,
                        avatarUrl: owner.avatar_ref
                                ? getFileUrl(owner.avatar_ref.couchdb_document_id, owner.avatar_ref.file_name)
                                : null
                    } : null,
                    status: clone.status,
                    created_at: clone.created_at
                };
            })
        );

        res.json({
            success: true,
            count: enrichedClones.length,
            clones: enrichedClones
        });

    } catch (error) {
        console.error('Error getting dataset clones:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU13 - Download dataset file
 * GET /api/datasets/:datasetId/files/:fileId
 * 
 * Downloads a file without trackings
 * Only approved and public datasets can be downloaded
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function downloadFile(req, res) {
    try {
        const db = getMongo();
        const { datasetId, fileId } = req.params;

        // Verify dataset exists and is accessible
        const dataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Check access permissions
        const isOwner = req.user && req.user.userId === dataset.owner_user_id;
        const isAdmin = req.user && req.user.isAdmin;
        const isPublic = dataset.status === 'approved' && dataset.is_public;

        // Only approved and public datasets can be downloaded (unless owner or admin)
        if (!isPublic && !isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Dataset not available for download'
            });
        }

        // Find the file reference
        const fileRef = dataset.file_references.find(
            f => f.couchdb_document_id === fileId
        );

        if (!fileRef) {
            return res.status(404).json({
                success: false,
                error: 'File not found in dataset'
            });
        }

        try {
            // Get file from CouchDB
            const { getFile } = require('../utils/couchdb-manager');
            const fileBuffer = await getFile(fileRef.couchdb_document_id, fileRef.file_name);

            // Set response headers for download
            res.setHeader('Content-Type', fileRef.mime_type);
            res.setHeader('Content-Disposition', `attachment; filename="${fileRef.file_name}"`);
            res.setHeader('Content-Length', fileRef.file_size_bytes);

            // Send file (NO TRACKING)
            res.send(fileBuffer);

        } catch (error) {
            console.error('Error retrieving file:', error.message);
            return res.status(500).json({
                success: false,
                error: 'Failed to download file'
            });
        }

    } catch (error) {
        console.error('Error in downloadFile:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU13 - Download complete dataset as ZIP
 * GET /api/datasets/:datasetId/download
 * 
 * Downloads all files in the dataset as a ZIP file
 * Tracks download in Neo4j + Redis (once per user)
 * Only approved and public datasets can be downloaded
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function downloadDataset(req, res) {
    try {
        const db = getMongo();
        const { datasetId } = req.params;

        // Verify dataset exists and is accessible
        const dataset = await db.collection('datasets').findOne({
            dataset_id: datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Check access permissions
        const isOwner = req.user && req.user.userId === dataset.owner_user_id;
        const isAdmin = req.user && req.user.isAdmin;
        const isPublic = dataset.status === 'approved' && dataset.is_public;

        // Only approved and public datasets can be downloaded (unless owner or admin)
        if (!isPublic && !isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Dataset not available for download'
            });
        }

        // Check if dataset has files
        if (!dataset.file_references || dataset.file_references.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Dataset has no files to download'
            });
        }

        const archiver = require('archiver');
        const { getFile } = require('../utils/couchdb-manager');

        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Set response headers
        const zipFilename = `${dataset.dataset_name.replace(/[^a-z0-9]/gi, '_')}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        // Handle archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            throw err;
        });

        // Pipe archive to response
        archive.pipe(res);

        // Add all files to archive
        for (const fileRef of dataset.file_references) {
            try {
                // console.log(`Adding file: ${fileRef.file_name}`);
                const fileData = await getFile(fileRef.couchdb_document_id, fileRef.file_name);

                let fileBuffer;

                // Handle different data types returned by CouchDB
                if (Buffer.isBuffer(fileData)) {
                    // Already a Buffer
                    fileBuffer = fileData;
                } else if (typeof fileData === 'string') {
                    // String (like CSV) - convert to Buffer
                    fileBuffer = Buffer.from(fileData, 'utf8');
                } else if (typeof fileData === 'object') {
                    // Object (like parsed JSON) - stringify and convert to Buffer
                    const jsonString = JSON.stringify(fileData, null, 2);
                    fileBuffer = Buffer.from(jsonString, 'utf8');
                } else {
                    // Fallback: try to convert whatever it is
                    fileBuffer = Buffer.from(fileData);
                }

                archive.append(fileBuffer, { name: fileRef.file_name });
                // console.log(`Added ${fileRef.file_name} (${fileBuffer.length} bytes)`);

            } catch (fileError) {
                console.error(`Error adding file ${fileRef.file_name}:`, fileError.message);
                // Continue with other files even if one fails
            }
        }

        // Finalize archive (triggers the actual streaming)
        archive.finalize();

        // Track download asynchronously ONLY if NOT owner (don't wait for it)
        if (!isOwner) {
            setImmediate(async () => {
                try {
                    // Check if user already downloaded this dataset
                    const { relationshipExists, createRelationship } = require('../utils/neo4j-relations');


                    // // Only track if first time downloading this dataset

                    // const alreadyDownloaded = await relationshipExists(
                    //     req.user.userId,
                    //     datasetId,
                    //     'DOWNLOADED'
                    // );


                    // if (!alreadyDownloaded) {
                    //     // Create DOWNLOADED relationship in Neo4j
                    //     await createRelationship(
                    //         req.user.userId,
                    //         datasetId,
                    //         'DOWNLOADED',
                    //         { downloaded_at: new Date().toISOString() },
                    //         'User',
                    //         'Dataset'
                    //     );

                    //     // Increment download counter in Redis
                    //     const { incrementCounter } = require('../utils/redis-counters');
                    //     await incrementCounter(`download_count:dataset:${datasetId}`);
                    // }

                    // Create DOWNLOADED relationship in Neo4j
                    await createRelationship(
                        req.user.userId,
                        datasetId,
                        'DOWNLOADED',
                        { downloaded_at: new Date().toISOString() },
                        'User',
                        'Dataset'
                    );

                    // Increment download counter in Redis
                    const { incrementCounter } = require('../utils/redis-counters');
                    await incrementCounter(`download_count:dataset:${datasetId}`);


                } catch (trackingError) {
                    console.error('Error tracking download:', trackingError.message);
                    // Don't fail the download if tracking fails
                }
            });
        }

    } catch (error) {
        console.error('Error in downloadDataset:', error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}

/**
 * HU13 - Get download statistics
 * GET /api/datasets/:datasetId/downloads
 * 
 * Returns download history and statistics
 * Only dataset owner can view this information
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDownloadStats(req, res) {
    try {
        const db = getMongo();
        const dataset = await db.collection('datasets').findOne({
            dataset_id: req.params.datasetId
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // // Only owner can view download statistics
        // if (dataset.owner_user_id !== req.user.userId) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'Forbidden: Only dataset owner can view download statistics'
        //     });
        // }

        // Get download history from Neo4j
        const { getNeo4j } = require('../config/databases');
        const driver = getNeo4j();
        const session = driver.session({ database: 'datec' });

        try {
            const result = await session.run(`
                MATCH (u:User)-[d:DOWNLOADED]->(ds:Dataset {dataset_id: $datasetId})
                RETURN u.user_id AS userId, 
                    u.username AS username, 
                    d.downloaded_at AS downloadedAt
                ORDER BY d.downloaded_at DESC
                LIMIT 100
            `, { datasetId: req.params.datasetId });

            const downloadHistory = await Promise.all(
                result.records.map(async (record) => {
                    const userId = record.get('userId');
                    const username = record.get('username');

                    // Get fullName from MongoDB
                    const user = await db.collection('users').findOne(
                        { user_id: userId },
                        { projection: { full_name: 1 , avatar_ref: 1 } }
                    );

                    return {
                        userId: userId,
                        username: username,
                        fullName: user?.full_name || 'Unknown User',
                        avatarUrl: user.avatar_ref
                                ? getFileUrl(user.avatar_ref.couchdb_document_id, user.avatar_ref.file_name)
                                : null,
                        downloadedAt: record.get('downloadedAt')
                    };
                })
            );

            // Get total download count from Redis
            const totalDownloads = await getCounter(`download_count:dataset:${req.params.datasetId}`);

            // Get unique users count
            const uniqueUsers = new Set(downloadHistory.map(d => d.userId)).size;

            res.json({
                success: true,
                statistics: {
                    totalDownloads: totalDownloads || 0,
                    uniqueUsers: uniqueUsers,
                    recentDownloads: downloadHistory
                }
            });

        } finally {
            await session.close();
        }

    } catch (error) {
        console.error('Error getting download stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    createDataset,        // HU5
    searchDatasets,       // HU9
    getDataset,           // HU10
    getUserDatasets,      // HU12
    requestApproval,      // HU6
    toggleVisibility,     // HU7
    updateDataset,
    deleteDataset,        // HU7
    cloneDataset,         // HU18
    getDatasetClones,     // HU18
    downloadFile,         // HU13
    downloadDataset,      // HU13
    getDownloadStats      // HU13
};