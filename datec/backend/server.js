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

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/datasets', require('./routes/dataset.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

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