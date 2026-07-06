import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'

import App from './App.jsx'
import './index.css'

// VITE_GOOGLE_CLIENT_ID is set in .env (frontend)
// In development: create frontend/.env with VITE_GOOGLE_CLIENT_ID=your_id
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* GoogleOAuthProvider makes useGoogleLogin() available app-wide */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
      {/* react-hot-toast — renders toasts in a fixed portal above everything */}
      <Toaster
        position="top-right"
        toastOptions={{
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
        }}
      />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
