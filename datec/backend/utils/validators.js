/**
 * Validation Schemas
 * Joi schemas for validating request data
 * Used across all controllers for input validation
 * 
 * @module utils/validators
 */

const Joi = require('joi');

/**
 * User registration validation schema
 * Used by: HU1 (register)
 */
const userRegistrationSchema = Joi.object({
    username: Joi.string()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
            'string.pattern.base': 'Username must contain only letters, numbers, and underscores',
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username must not exceed 30 characters'
        }),

    email_address: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Must be a valid email address'
        }),

    password: Joi.string()
        .min(8)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters'
        }),

    full_name: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.min': 'Full name is required',
            'string.max': 'Full name must not exceed 100 characters'
        }),

    birth_date: Joi.date()
        .max('now')
        .required()
        .messages({
            'date.max': 'Birth date cannot be in the future'
        })
});

/**
 * User login validation schema
 * Used by: HU1 (login)
 */
const userLoginSchema = Joi.object({
    username: Joi.string()
        .required()
        .messages({
            'any.required': 'Username is required'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

/**
 * User profile update validation schema
 * Used by: HU4 (edit profile)
 */
const userUpdateSchema = Joi.object({
    full_name: Joi.string()
        .min(1)
        .max(100)
        .optional(),

    birth_date: Joi.date()
        .max('now')
        .optional()
});

/**
 * Dataset creation validation schema
 * Used by: HU5 (create dataset)
 */
const datasetCreateSchema = Joi.object({
    dataset_name: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'Dataset name must be at least 3 characters',
            'string.max': 'Dataset name must not exceed 100 characters'
        }),

    description: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .messages({
            'string.min': 'Description must be at least 10 characters',
            'string.max': 'Description must not exceed 5000 characters'
        }),

    tags: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .optional()
        .messages({
            'array.max': 'Maximum 10 tags allowed'
        }),

    tutorial_video_url: Joi.string()
        .uri()
        .pattern(/(youtube|youtu.be|vimeo)/)
        .optional()
        .allow(null, '')
        .messages({
            'string.uri': 'Must be a valid URL',
            'string.pattern.base': 'Only YouTube and Vimeo URLs are allowed'
        })
});

/**
 * Dataset update validation schema
 * Used by: HU7 (edit dataset)
 */
const datasetUpdateSchema = Joi.object({
    dataset_name: Joi.string()
        .min(3)
        .max(100)
        .optional(),

    description: Joi.string()
        .min(10)
        .max(5000)
        .optional(),

    tags: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .optional(),

    tutorial_video_url: Joi.string()
        .uri()
        .pattern(/(youtube|vimeo)/)
        .optional()
        .allow(null, ''),

    is_public: Joi.boolean()
        .optional()
});

/**
 * Dataset clone validation schema
 * Used by: HU18 (clone dataset)
 */
const datasetCloneSchema = Joi.object({
    new_dataset_name: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'New dataset name must be at least 3 characters',
            'string.max': 'New dataset name must not exceed 100 characters',
            'any.required': 'new_dataset_name is required for cloning'
        })
});

/**
 * Comment creation validation schema
 * Used by: HU15 (add comment)
 */
const commentCreateSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(2000)
        .required()
        .messages({
            'string.min': 'Comment cannot be empty',
            'string.max': 'Comment must not exceed 2000 characters'
        }),

    parent_comment_id: Joi.string()
        .optional()
        .allow(null)
});

/**
 * Private message creation validation schema
 * Used by: HU21 (send message)
 */
const messageCreateSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(5000)
        .required()
        .messages({
            'string.min': 'Message cannot be empty',
            'string.max': 'Message must not exceed 5000 characters'
        })
});

/**
 * Admin review validation schema
 * Used by: HU8 (approve/reject dataset)
 */
const adminReviewSchema = Joi.object({
    action: Joi.string()
        .valid('approve', 'reject')
        .required()
        .messages({
            'any.only': 'Action must be either approve or reject'
        }),

    admin_review: Joi.string()
        .max(500)
        .optional()
        .allow(null, '')
        .messages({
            'string.max': 'Review comment must not exceed 500 characters'
        })
});

/**
 * Pagination validation schema
 * Used by: Multiple endpoints for pagination
 */
const paginationSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .optional(),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .optional()
});

/**
 * Search query validation schema
 * Used by: HU9 (search datasets), HU14 (search users)
 */
const searchQuerySchema = Joi.object({
    q: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.min': 'Search query cannot be empty',
            'string.max': 'Search query must not exceed 100 characters'
        })
});

/**
 * Validate age requirement (15+)
 * Helper function for user registration
 * 
 * @param {Date|string} birthDate - Birth date to validate
 * @returns {boolean} True if user is 15 or older
 */
function validateAge(birthDate) {
    const date = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--;
    }

    return age >= 15;
}

/**
 * Validate file size
 * 
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} True if file size is within limit
 */
function validateFileSize(fileSize, maxSize) {
    return fileSize <= maxSize;
}

/**
 * Validate image file type
 * 
 * @param {string} mimetype - File mimetype
 * @returns {boolean} True if mimetype is an image
 */
function validateImageType(mimetype) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return allowedTypes.includes(mimetype.toLowerCase());
}

/**
 * Validate dataset file type
 * 
 * @param {string} mimetype - File mimetype
 * @returns {boolean} True if mimetype is allowed for datasets
 */
function validateDatasetFileType(mimetype) {
    const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'text/plain'
    ];
    return allowedTypes.includes(mimetype.toLowerCase());
}

/**
 * Validate username format
 * 
 * @param {string} username - Username to validate
 * @returns {boolean} True if username format is valid
 */
function validateUsername(username) {
    const pattern = /^[a-zA-Z0-9_]{3,30}$/;
    return pattern.test(username);
}

/**
 * Validate email format
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if email format is valid
 */
function validateEmail(email) {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
}

module.exports = {
    // Joi schemas
    userRegistrationSchema,
    userLoginSchema,
    userUpdateSchema,
    datasetCreateSchema,
    datasetUpdateSchema,
    datasetCloneSchema,
    commentCreateSchema,
    messageCreateSchema,
    adminReviewSchema,
    paginationSchema,
    searchQuerySchema,

    // Helper validators
    validateAge,
    validateFileSize,
    validateImageType,
    validateDatasetFileType,
    validateUsername,
    validateEmail
};