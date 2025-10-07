import { defineStore } from 'pinia'
import { authService } from '@/services/auth'

/**
 * Authentication store for user state management
 * Handles login, registration, session persistence, and user profile management
 */
export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token'),
    }),

    getters: {
        /**
         * Determines if user is currently authenticated
         * @returns {boolean} Authentication status
         */
        isLoggedIn: (state) => !!state.token,

        /**
         * Checks if current user has administrative privileges
         * @returns {boolean} Admin status
         */
        isAdmin: (state) => state.user?.isAdmin || false,
    },

    actions: {
        /**
         * Authenticates user with provided credentials
         * @param {Object} credentials - User login credentials
         * @param {string} credentials.username - Username
         * @param {string} credentials.password - Password
         * @returns {Promise<Object>} Authentication response
         */
        async login(credentials) {
            const response = await authService.login(credentials)
            this.user = response.user
            this.token = response.token
            localStorage.setItem('token', response.token)
            return response
        },

        /**
         * Registers new user account
         * @param {Object} userData - User registration data
         * @returns {Promise<Object>} Registration response
         */
        async register(userData) {
            const response = await authService.register(userData)
            return response
        },

        /**
         * Retrieves and updates current user profile information
         * Used to refresh user data after page reload or token validation
         * @returns {Promise<void>}
         */
        async fetchCurrentUser() {
            const response = await authService.getCurrentUser()
            this.user = response.user
        },

        /**
         * Terminates user session and clears stored data
         */
        logout() {
            this.user = null
            this.token = null
            localStorage.removeItem('token')
        },
    },

    persist: true,
})
