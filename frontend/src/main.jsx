import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'

import App from './App.jsx'
import './index.css'

// ── VITE_GOOGLE_CLIENT_ID ────────────────────────────────────────────────────
// Set in frontend/.env  →  VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
// When absent, Google OAuth is gracefully disabled (the login button is hidden).
// We pass a fallback string so GoogleOAuthProvider doesn't receive an empty string,
// which caused the underlying library to throw an error on hook initialization.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'DISABLED'

const toasterOptions = {
  duration: 4000,
  style: {
    background: 'rgba(15, 15, 35, 0.95)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontFamily: 'Inter, sans-serif',
  },
  success: {
    iconTheme: { primary: '#10b981', secondary: '#0f0f23' },
    style: { borderColor: 'rgba(16,185,129,0.3)' },
  },
  error: {
    iconTheme: { primary: '#ef4444', secondary: '#0f0f23' },
    style: { borderColor: 'rgba(239,68,68,0.3)' },
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* GoogleOAuthProvider needs a non-empty clientId string to avoid an internal
        assertion error. We pass 'DISABLED' when no real key is configured.
        The actual Google button (GoogleLoginButton.jsx) is lazily loaded and
        only rendered when VITE_GOOGLE_CLIENT_ID is a real value — so the
        useGoogleLogin hook never fires with the placeholder. */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={toasterOptions}
      />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
