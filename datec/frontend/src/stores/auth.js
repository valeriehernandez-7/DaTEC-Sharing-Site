import { defineStore } from 'pinia'
import { authService } from '@/services/auth'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token')
    }),

    getters: {
        isLoggedIn: (state) => !!state.token,
        isAdmin: (state) => state.user?.isAdmin || false
    },

    actions: {
        async login(credentials) {
            try {
                const response = await authService.login(credentials)
                this.user = response.user
                this.token = response.token
                localStorage.setItem('token', response.token)
                return response
            } catch (error) {
                throw error
            }
        },

        async register(userData) {
            try {
                const response = await authService.register(userData)
                return response
            } catch (error) {
                throw error
            }
        },

        logout() {
            this.user = null
            this.token = null
            localStorage.removeItem('token')
        },

        async fetchCurrentUser() {
            const response = await authService.getCurrentUser()
            this.user = response.user
        }
    },

    persist: true
})