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
    },

    /**
     * Gets follower count for a specific user
     * @param {string} username - Target username
     * @returns {Promise<number>} Follower count
     */
    async getUserFollowerCount(username) {
        try {
            const response = await api.get(`/users/${username}/followers`)
            return response.data.count || 0
        } catch (error) {
            console.error(`Failed to get followers for ${username}:`, error)
            return 0
        }
    },

    /**
     * Gets detailed dataset information including vote counts
     * @param {string} datasetId - Dataset identifier
     * @returns {Promise<Object>} Dataset details
     */
    async getDatasetDetails(datasetId) {
        try {
            const response = await api.get(`/datasets/${datasetId}`)
            return response.data.dataset
        } catch (error) {
            console.error(`Failed to get dataset details for ${datasetId}:`, error)
            return null
        }
    }
}