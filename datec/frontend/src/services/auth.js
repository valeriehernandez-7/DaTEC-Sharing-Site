import api from './api'

/**
 * Authentication service for user management operations
 * Handles login, registration, and user profile retrieval
 */
export const authService = {
    /**
     * Authenticates user with provided credentials
     * @param {Object} credentials - User authentication credentials
     * @param {string} credentials.username - Username for authentication
     * @param {string} credentials.password - Password for authentication
     * @returns {Promise<Object>} Authentication response containing token and user data
     * @throws {Error} When authentication fails or network error occurs
     */
    async login(credentials) {
        const response = await api.post('/auth/login', credentials)
        return response.data
    },

    /**
     * Registers new user account in the system
     * @param {Object} userData - User registration information
     * @param {string} userData.username - Unique username identifier
     * @param {string} userData.email_address - User email address
     * @param {string} userData.full_name - User full name
     * @param {string} userData.birth_date - User birth date (YYYY-MM-DD format)
     * @param {string} userData.password - User password
     * @returns {Promise<Object>} Registration response with success status
     * @throws {Error} When registration fails due to validation or conflict
     */
    async register(userData) {
        const response = await api.post('/auth/register', userData)
        return response.data
    },

    /**
     * Retrieves current authenticated user profile information
     * Requires valid JWT token in request headers
     * @returns {Promise<Object>} User profile data
     * @throws {Error} When token is invalid or user not found
     */
    async getCurrentUser() {
        const response = await api.get('/auth/me')
        return response.data
    },
}
