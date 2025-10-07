/**
 * DaTEC Backend Server
 * Main application entry point
 * Initializes database connections and starts Express server
 * 
 * @module server
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
    connectMongo,
    connectRedis,
    connectNeo4j,
    connectCouchDB
} = require('./config/databases');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'DaTEC API is running',
        timestamp: new Date().toISOString()
    });
});

// CouchDB file handler
app.get('/api/files/:documentId/:filename', async (req, res) => {
    try {
        const { getFile } = require('./utils/couchdb-manager');
        const { documentId, filename } = req.params;

        console.log('File request:', { documentId, filename });

        const fileBuffer = await getFile(documentId, filename);

        const getContentType = (filename) => {
            const ext = filename.toLowerCase().split('.').pop();
            const types = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml'
            };
            return types[ext] || 'application/octet-stream';
        };

        const contentType = getContentType(filename);

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        // Send file
        res.send(fileBuffer);

    } catch (error) {
        console.error('File serve error:', error.message);

        if (error.message === 'File not found') {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to serve file'
        });
    }
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/datasets', require('./routes/dataset.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api', require('./routes/vote.routes'));
app.use('/api', require('./routes/comment.routes'));


// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server and connect to databases
async function startServer() {
    try {
        console.log('Connecting to databases...\n');

        // Connect to all databases
        await connectMongo();
        await connectRedis();
        await connectNeo4j();
        await connectCouchDB();

        console.log('\nAll databases connected successfully');

        // Start Express server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`\nServer running on http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
        });

    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error.message);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    process.exit(1);
});

// Start the server
startServer();