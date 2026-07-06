import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'

import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar.jsx'

function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [googleLoading, setGoogleLoading] = useState(false)

  const loginStore = useAuthStore(s => s.login)
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = location.state?.from?.pathname || '/dashboard'

  // ── Email/password submit ────────────────────────────────────────────────
  const onSubmit = async (data) => {
    try {
      const response = await authApi.login(data)
      const { access_token, user } = response.data
      loginStore(access_token, user)
      toast.success('Welcome back! 👋')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error?.message || 'Login failed.'
      toast.error(msg)
    }
  }

  // ── Google OAuth flow ─────────────────────────────────────────────────────
  // useGoogleLogin triggers the Google popup. On success it gives us the
  // access_token from Google, which we send to our backend to get our JWT.
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        // Google returns an access_token (not ID token for this flow)
        // We send it to our backend which verifies it via Google's userinfo API
        const res = await authApi.googleLogin(tokenResponse.access_token)
        const { access_token, user } = res.data
        loginStore(access_token, user)
        toast.success('Signed in with Google! 🎉')
        navigate(from, { replace: true })
      } catch (err) {
        toast.error('Google sign-in failed. Please try again.')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => {
      toast.error('Google sign-in was cancelled or failed.')
      setGoogleLoading(false)
    },
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '6rem 1.5rem 2rem',
      }}>
        <motion.div
          className="card card-glow"
          style={{ width: '100%', maxWidth: '420px' }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🤝</span>
            <h1 style={{
              fontSize: '1.8rem', fontFamily: 'var(--font-heading)',
              fontWeight: 800, marginTop: '0.75rem', marginBottom: '0.5rem',
            }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Sign in to continue your impact journey
            </p>
          </div>

          {/* Google Sign-In button */}
          <button
            type="button"
            onClick={() => { setGoogleLoading(true); googleLogin() }}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', color: 'var(--color-text)', fontSize: '0.95rem',
              fontWeight: 600, cursor: googleLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', marginBottom: '1.25rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            {googleLoading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                })}
                style={{ borderColor: errors.email ? 'var(--color-error)' : undefined }}
              />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
                style={{ borderColor: errors.password ? 'var(--color-error)' : undefined }}
              />
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
            >
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
              Create one free
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default Login
