import axios from 'axios'

/**
 * Axios instance configuration for DaTEC API
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
 * Request interceptor for JWT token attachment
 * Automatically adds authorization header to all requests
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

/**
 * Response interceptor for global error handling
 * Logs errors and manages token cleanup without automatic redirects
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Request Failed:', {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        })

        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            console.log('Authentication token cleared due to 401 response')
        }

        return Promise.reject(error)
    }
)

export default api