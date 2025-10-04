import api from './api'

export const authService = {
    async login(credentials) {
        try {
            const response = await api.post('/auth/login', credentials)
            return response.data
        } catch (error) {
            throw error
        }
    },

    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData)
            return response.data
        } catch (error) {
            throw error
        }
    },

    async getCurrentUser() {
        try {
            const response = await api.get('/auth/me')
            return response.data
        } catch (error) {
            throw error
        }
    }
}