import api from './api'

/**
 * Unified search service for datasets and users
 * Handles search operations across different entity types
 */
export const searchService = {
    /**
     * Searches datasets by name, description, or tags
     * @param {string} query - Search term
     * @param {number} limit - Maximum results to return
     * @returns {Promise<Array>} Search results
     */
    async searchDatasets(query, limit = 10) {
        const response = await api.get(`/datasets/search?q=${encodeURIComponent(query)}`)
        return response.data.datasets || []
    },

    /**
     * Searches users by username or full name
     * @param {string} query - Search term
     * @param {number} limit - Maximum results to return
     * @returns {Promise<Array>} Search results
     */
    async searchUsers(query, limit = 10) {
        const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`)
        return response.data.users || []
    }
}