import axios from 'axios'

/**
 * Axios instance with base configuration for DaTEC API
 * @type {import('axios').AxiosInstance}
 */
const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

/**
 * Request interceptor for automatic JWT token attachment
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default api