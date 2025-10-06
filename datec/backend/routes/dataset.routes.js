/**
 * Dataset Routes
 * Defines all dataset-related endpoints
 * 
 * @module routes/dataset.routes
 * 
 * Routes:
 * - POST   /api/datasets                          - Create dataset (HU5)
 * - GET    /api/datasets/search                   - Search datasets (HU9)
 * - GET    /api/datasets/user/:username           - Get user's datasets (HU12)
 * - GET    /api/datasets/:datasetId               - Get dataset details (HU10)
 * - PATCH /api/datasets/:datasetId                - Update dataset details
 * - PATCH  /api/datasets/:datasetId/review-request - Request approval (HU6)
 * - PATCH  /api/datasets/:datasetId/visibility    - Toggle visibility (HU7)
 * - DELETE /api/datasets/:datasetId               - Delete dataset (HU7)
 * - POST   /api/datasets/:datasetId/clone         - Clone dataset (HU18)
 * - GET /api/datasets/:datasetId/clones           - Clone dataset (HU18)
 * - GET /api/datasets/:datasetId/download         - Download dataset (H13)
 * - GET /api/datasets/:datasetId/downloads        - Download dataset (H13)
 * - GET /api/datasets/:datasetId/files/:fileId    - Download dataset (H13)
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/dataset.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { uploadDataset } = require('../middleware/upload');

/**
 * Public Routes
 * No authentication required
 */

/**
 * GET /api/datasets/search
 * Search datasets by name, description, or tags
 * Query params: q (search term, required)
 * 
 * Response: { success, count, datasets[] }
 * 
 * Example: /api/datasets/search?q=sales
 */
router.get('/search', controller.searchDatasets);

/**
 * GET /api/datasets/user/:username
 * Get all datasets from a specific user
 * Returns only public datasets unless viewing own profile
 * 
 * Response: { success, count, username, datasets[] }
 * 
 * Note: Authentication is optional but recommended to see your own private datasets
 */
router.get('/user/:username', verifyToken, controller.getUserDatasets);

/**
 * GET /api/datasets/:datasetId
 * Get complete dataset information
 * Returns dataset details including file sizes and download URLs
 * Only approved and public datasets accessible (unless owner or admin)
 * 
 * Response: { success, dataset }
 */
router.get('/:datasetId', optionalAuth, controller.getDataset);

/**
 * Protected Routes
 * Require authentication via JWT token
 */

/**
 * POST /api/datasets
 * Create new dataset
 * Requires: Authenticated user
 * 
 * Body (multipart/form-data):
 *   - dataset_name: string (required, 3-100 chars)
 *   - description: string (required, 10-5000 chars)
 *   - tags: array of strings (optional)
 *   - tutorial_video_url: string (optional, must be YouTube or Vimeo)
 * 
 * Files:
 *   - data_files: array of files (required, 1-10 files, max 1GB each)
 *   - header_photo: single image file (optional, max 5MB)
 * 
 * Response: { success, message, dataset }
 * 
 * Databases affected:
 *   - MongoDB: Creates dataset document
 *   - CouchDB: Uploads all files and header photo
 *   - Neo4j: Creates Dataset node
 *   - Redis: Initializes download_count and vote_count counters
 */
router.post(
    '/',
    verifyToken,
    uploadDataset,
    controller.createDataset
);

/**
 * PATCH /api/datasets/:datasetId/review-request
 * Request admin approval for dataset
 * Requires: Dataset owner
 * 
 * Response: { success, message, status }
 * 
 * Note: Dataset must be in 'pending' status
 */
router.patch(
    '/:datasetId/review-request',
    verifyToken,
    controller.requestApproval
);

/**
 * PATCH /api/datasets/:datasetId/visibility
 * Toggle dataset visibility (public/private)
 * Requires: Dataset owner
 * 
 * Body:
 *   - is_public: boolean (required)
 * 
 * Response: { success, message, is_public }
 * 
 * Note: Only approved datasets can be made public
 */
router.patch(
    '/:datasetId/visibility',
    verifyToken,
    controller.toggleVisibility
);

/**
 * PATCH /api/datasets/:datasetId
 * Update dataset information and files
 * Requires: Dataset owner
 * 
 * Body (multipart/form-data):
 *   - dataset_name: string (optional, 3-100 chars)
 *   - description: string (optional, 10-5000 chars)
 *   - tags: array of strings (optional)
 *   - tutorial_video_url: string (optional, YouTube/Vimeo URL or null to remove)
 *   - files_to_delete: array of file IDs (optional)
 *   - header_photo: null (to remove existing)
 * 
 * Files:
 *   - data_files: array of files (optional, max 10 files)
 *   - header_photo: single image file (optional)
 * 
 * Response: { success, message, dataset }
 */
router.patch(
    '/:datasetId',
    verifyToken,
    uploadDataset,
    controller.updateDataset
);

/**
 * DELETE /api/datasets/:datasetId
 * Permanently delete dataset
 * Requires: Dataset owner or admin
 * 
 * Response: { success, message }
 * 
 * Side effects:
 *   - Deletes from MongoDB (dataset document, votes, comments)
 *   - Deletes from CouchDB (all files and header photo)
 *   - Deletes from Neo4j (Dataset node and all relationships)
 *   - Deletes from Redis (download_count and vote_count)
 */
router.delete(
    '/:datasetId',
    verifyToken,
    controller.deleteDataset
);

/**
 * POST /api/datasets/:datasetId/clone
 * Clone an existing dataset
 * Requires: Authenticated user
 * 
 * Body (JSON):
 *   - new_dataset_name: string (required, 3-100 chars, must be different from original)
 * 
 * Response: { success, message, dataset }
 * 
 * Conditions (HU18):
 *   - Original dataset must be approved (status='approved')
 *   - CAN clone your own dataset (you are the owner)
 *   - Must provide a DIFFERENT name than the original
 *   - If cloning someone else's dataset, it must be public (is_public=true)
 *   - If cloning your own dataset, can be private or public
 * 
 * Side effects:
 *   - Creates complete copy in all 4 databases
 *   - Duplicates all files in CouchDB with new document IDs
 *   - Sets parent_dataset_id to reference original
 *   - New dataset starts with status='pending'
 *   - New owner is the user who cloned it
 */
router.post(
    '/:datasetId/clone',
    verifyToken,
    controller.cloneDataset
);

/**
 * GET /api/datasets/:datasetId/clones
 * Get all datasets cloned from this dataset
 * 
 * Response: { success, count, clones[] }
 * 
 * Note: Public endpoint - shows clone relationships
 */
router.get('/:datasetId/clones', controller.getDatasetClones);

/**
 * GET /api/datasets/:datasetId/download
 * Download complete dataset as ZIP file
 * Requires: Authentication
 * 
 * Response: ZIP file download (binary)
 * 
 * Side effects (HU13):
 *   - Creates DOWNLOADED relationship in Neo4j (once per user)
 *   - Increments download_count in Redis (once per user)
 * 
 * Note: Downloads all files in a single ZIP archive
 */
router.get(
    '/:datasetId/download',
    verifyToken,
    controller.downloadDataset
);

/**
 * GET /api/datasets/:datasetId/files/:fileId
 * Download a specific file from dataset (preview/exploration)
 * Requires: Authentication
 * 
 * Response: File download (binary)
 * 
 * Note: Does NOT track in statistics. Use /:datasetId/download for full dataset download with tracking.
 */
router.get(
    '/:datasetId/files/:fileId',
    verifyToken,
    controller.downloadFile
);

/**
 * GET /api/datasets/:datasetId/downloads
 * Get download statistics for dataset
 * Requires: Dataset owner
 * 
 * Response: { success, statistics: { totalDownloads, uniqueUsers, recentDownloads[] } }
 */
router.get(
    '/:datasetId/downloads',
    verifyToken,
    controller.getDownloadStats
);

module.exports = router;