import { useState, lazy, Suspense } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

// VITE_GOOGLE_CLIENT_ID is evaluated at build time.
// If it's empty, the Google button is NOT rendered — this prevents
// @react-oauth/google from throwing and crashing the whole Login page.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Lazily import so the hook code is tree-shaken when Google is not configured.
const GoogleLoginButton = GOOGLE_CLIENT_ID
  ? lazy(() => import('../components/GoogleLoginButton.jsx'))
  : null

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [googleLoading, setGoogleLoading] = useState(false)

  const loginStore = useAuthStore(s => s.login)
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = location.state?.from?.pathname || '/dashboard'

  // ── Email / password ─────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    try {
      const response = await authApi.login(data)
      const { access_token, user } = response.data
      loginStore(access_token, user)
      toast.success('Welcome back! 👋')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail
                  || err.response?.data?.error?.message
                  || 'Login failed. Please check your credentials.'
      toast.error(msg)
    }
  }

  // ── Google OAuth (called by GoogleLoginButton child) ─────────────────────
  const handleGoogleToken = async (googleAccessToken) => {
    setGoogleLoading(true)
    try {
      const res = await authApi.googleLogin(googleAccessToken)
      const { access_token, user } = res.data
      loginStore(access_token, user)
      toast.success('Signed in with Google! 🎉')
      navigate(from, { replace: true })
    } catch {
      toast.error('Google sign-in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

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
          animate={{ y: 0, opacity: 1 }}
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

          {/* Google Sign-In button — only when VITE_GOOGLE_CLIENT_ID is set */}
          {GoogleLoginButton && (
            <>
              <Suspense fallback={
                <div style={{ width: '100%', height: '48px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', marginBottom: '1.25rem' }} />
              }>
                <GoogleLoginButton loading={googleLoading} onToken={handleGoogleToken} />
              </Suspense>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              </div>
            </>
          )}

          {/* Email / password form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                autoComplete="email"
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
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Your password"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
                style={{ borderColor: errors.password ? 'var(--color-error)' : undefined }}
              />
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <button
              id="login-submit"
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
      <Footer />
    </motion.div>
  )
}
