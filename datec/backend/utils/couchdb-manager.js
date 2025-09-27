/**
 * CouchDB File Manager
 * Handles file upload, download, and deletion operations
 * Used by: HU1 (avatar), HU4 (avatar), HU5 (files), HU18 (clone files)
 * 
 * @module utils/couchdb-manager
 */

const { getCouchDB } = require('../config/databases');

/**
 * Upload a file to CouchDB with metadata
 * 
 * @param {string} docId - Unique document ID
 * @param {Object} file - File object from multer (buffer, originalname, mimetype, size)
 * @param {Object} metadata - Additional metadata (type, owner_user_id, dataset_id, etc.)
 * @returns {Object} File reference object with couchdb_document_id, file_name, file_size_bytes, mime_type
 * @throws {Error} If file validation fails or upload fails
 */
async function uploadFile(docId, file, metadata) {
    try {
        const couchdb = getCouchDB();
        const db = couchdb.db.use('datec');

        // Validate file exists
        if (!file || !file.buffer) {
            throw new Error('Invalid file: buffer is required');
        }

        // Validate file size (max 1GB for dataset files, 5MB for photos, 2MB for avatars)
        const maxSize = metadata.type === 'user_avatar' ? 2 * 1024 * 1024 :
            metadata.type === 'header_photo' ? 5 * 1024 * 1024 :
                1024 * 1024 * 1024; // 1GB for dataset files

        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            throw new Error(`File size exceeds maximum allowed (${maxSizeMB}MB)`);
        }

        // Validate mime type based on file type
        if (metadata.type === 'user_avatar' || metadata.type === 'header_photo') {
            if (!file.mimetype.startsWith('image/')) {
                throw new Error('Only image files are allowed for avatars and photos');
            }
        }

        // Check if document exists and get its revision
        let rev = null;
        try {
            const existingDoc = await db.get(docId);
            rev = existingDoc._rev;
        } catch (error) {
            // Document doesn't exist, which is fine
        }

        // Create document with attachment in one operation
        const document = {
            _id: docId,
            type: metadata.type,
            owner_user_id: metadata.owner_user_id,
            uploaded_at: new Date().toISOString(),
            ...metadata,
            _attachments: {
                [file.originalname]: {
                    content_type: file.mimetype,
                    data: file.buffer.toString('base64')
                }
            }
        };

        // Include revision if document exists (update instead of create)
        if (rev) {
            document._rev = rev;
        }

        // Insert document with attachment
        await db.insert(document);

        // Return file reference
        return {
            couchdb_document_id: docId,
            file_name: file.originalname,
            file_size_bytes: file.size,
            mime_type: file.mimetype
        };

    } catch (error) {
        console.error('CouchDB upload failed:', error.message);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Delete a file from CouchDB
 * 
 * @param {string} docId - Document ID to delete
 * @returns {boolean} True if deletion successful
 * @throws {Error} If deletion fails
 */
async function deleteFile(docId) {
    try {
        const couchdb = getCouchDB();
        const db = couchdb.db.use('datec');

        // Get document to retrieve revision
        const doc = await db.get(docId);

        // Delete document (this also deletes all attachments)
        await db.destroy(docId, doc._rev);

        return true;

    } catch (error) {
        if (error.statusCode === 404) {
            console.warn(`Document ${docId} not found, already deleted`);
            return true;
        }
        console.error('CouchDB delete failed:', error.message);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}

/**
 * Get file URL for download
 * 
 * @param {string} docId - Document ID
 * @param {string} filename - Attachment filename
 * @returns {string} URL to download file
 */
function getFileUrl(docId, filename) {
    const couchdbBaseUrl = process.env.COUCHDB_URL.replace(/\/\/[^@]+@/, '//');
    return `${couchdbBaseUrl}/datec/${docId}/${encodeURIComponent(filename)}`;
}

/**
 * Get file attachment from CouchDB
 * 
 * @param {string} docId - Document ID
 * @param {string} filename - Attachment filename
 * @returns {Buffer} File buffer
 * @throws {Error} If file not found
 */
async function getFile(docId, filename) {
    try {
        const couchdb = getCouchDB();
        const db = couchdb.db.use('datec');

        const attachment = await db.attachment.get(docId, filename);
        return attachment;

    } catch (error) {
        if (error.statusCode === 404) {
            throw new Error('File not found');
        }
        console.error('CouchDB get file failed:', error.message);
        throw new Error(`Failed to retrieve file: ${error.message}`);
    }
}

/**
 * Check if document exists in CouchDB
 * 
 * @param {string} docId - Document ID to check
 * @returns {boolean} True if document exists
 */
async function documentExists(docId) {
    try {
        const couchdb = getCouchDB();
        const db = couchdb.db.use('datec');

        await db.get(docId);
        return true;

    } catch (error) {
        if (error.statusCode === 404) {
            return false;
        }
        throw error;
    }
}

module.exports = {
    uploadFile,
    deleteFile,
    getFileUrl,
    getFile,
    documentExists
};