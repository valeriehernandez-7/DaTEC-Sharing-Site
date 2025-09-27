/**
 * File Upload Middleware
 * Multer configurations for different file types
 * Used by: HU1 (avatar), HU4 (avatar), HU5 (datasets)
 * 
 * @module middleware/upload
 */

const multer = require('multer');

// Use memory storage to keep files in buffer
const storage = multer.memoryStorage();

/**
 * File filter for images only
 * Used for avatars and header photos
 */
const imageFileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (JPEG, PNG, WebP)'), false);
    }
};

/**
 * File filter for dataset files
 * Allows CSV, Excel, JSON, and text files
 */
const datasetFileFilter = (req, file, cb) => {
    const allowedMimes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV, Excel, JSON, and TXT files are allowed'), false);
    }
};

/**
 * Upload middleware for user avatar
 * Single file, max 2MB, images only
 * Field name: 'avatar'
 */
const uploadAvatar = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: imageFileFilter
}).single('avatar');

/**
 * Upload middleware for dataset header photo
 * Single file, max 5MB, images only
 * Field name: 'header_photo'
 */
const uploadHeaderPhoto = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: imageFileFilter
}).single('header_photo');

/**
 * Upload middleware for dataset data files
 * Multiple files, max 1GB each, CSV/Excel/JSON/TXT only
 * Field name: 'data_files'
 * Max count: 10 files
 */
const uploadDataFiles = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB
        files: 10 // Max 10 files
    },
    fileFilter: datasetFileFilter
}).array('data_files', 10);

/**
 * Upload middleware for dataset creation
 * Handles multiple file types in one request:
 * - data_files: up to 10 files, max 1GB each
 * - header_photo: 1 file, max 5MB
 */
const uploadDataset = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB per file
        files: 11 // 10 data files + 1 header photo
    }
}).fields([
    { name: 'data_files', maxCount: 10 },
    { name: 'header_photo', maxCount: 1 }
]);

/**
 * Wrapper to handle multer errors
 * Converts multer errors to JSON responses
 * 
 * @param {Function} uploadMiddleware - Multer middleware function
 * @returns {Function} Express middleware
 */
function handleMulterError(uploadMiddleware) {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // Multer-specific errors
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: 'File size exceeds maximum allowed limit'
                    });
                }

                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        error: 'Too many files. Maximum 10 files allowed'
                    });
                }

                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        success: false,
                        error: 'Unexpected field name in file upload'
                    });
                }

                return res.status(400).json({
                    success: false,
                    error: `Upload error: ${err.message}`
                });
            }

            if (err) {
                // Custom errors (from fileFilter)
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            }

            next();
        });
    };
}

// Export wrapped middlewares with error handling
module.exports = {
    uploadAvatar: handleMulterError(uploadAvatar),
    uploadHeaderPhoto: handleMulterError(uploadHeaderPhoto),
    uploadDataFiles: handleMulterError(uploadDataFiles),
    uploadDataset: handleMulterError(uploadDataset)
};