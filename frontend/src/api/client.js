// Axios: the HTTP client library.
import axios from 'axios'

// We import the store directly (not as a hook) because this file
// is not a React component — it's a plain JS module.
// Hooks can ONLY be used inside React components.
// For plain JS files, you call .getState() directly.
import { useAuthStore } from '../store/authStore'

// axios.create() makes a pre-configured instance.
// Every call through this instance automatically uses this baseURL and headers.
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',  // Your FastAPI backend

  // All requests will send/receive JSON.
  headers: { 'Content-Type': 'application/json' },

  // If a request takes more than 10 seconds, cancel it.
  timeout: 10000,
})

// ── REQUEST INTERCEPTOR ──────────────────────────────────────────
// Interceptors are middleware for Axios.
// This runs BEFORE every request is sent.
// It reads the JWT token from the store and adds it to the headers.
// Without this, you'd have to manually add the token on every API call.

api.interceptors.request.use(
  (config) => {
    // getState() reads the Zustand store outside of React.
    // This is the non-hook way to access state.
    const token = useAuthStore.getState().token

    if (token) {
      // The Authorization header format FastAPI expects:
      // "Bearer <your_token_string>"
      config.headers.Authorization = `Bearer ${token}`
    }

    return config  // Must return config — Axios uses this to make the request.
  },
  // If something goes wrong while building the request (rare), reject it.
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────────
// Runs AFTER every response comes back.
// We use it to handle 401 errors globally — if the token expires,
// automatically log the user out instead of showing cryptic errors.

api.interceptors.response.use(
  // If the response is successful (2xx), just pass it through.
  (response) => response,

  // If the response is an error (4xx, 5xx):
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth and send to login.
      // This happens automatically for every protected endpoint.
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
