import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'

import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar.jsx'

function Login() {
  // useForm() returns tools to manage the form.
  // register: connects an input to the form (like giving it a name in backend)
  // handleSubmit: wrapper that validates before calling our function
  // formState: contains errors, isSubmitting, etc.
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const [serverError, setServerError] = useState(null)  // Backend error message
  const login    = useAuthStore(s => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  // After login, go back to where the user was, or Dashboard by default
  const from = location.state?.from?.pathname || '/dashboard'

  // This runs only if all validations pass.
  // data = { email: "...", password: "..." }
  const onSubmit = async (data) => {
    setServerError(null)  // Clear previous errors

    try {
      // POST to FastAPI /auth/login
      // axios automatically parses the JSON response
      const response = await api.post('/auth/login', data)

      // Our backend returns: { access_token, user }
      const { access_token, user } = response.data

      // Save to Zustand (and localStorage via persist middleware)
      login(access_token, user)

      // Navigate to dashboard (or where they came from)
      navigate(from, { replace: true })

    } catch (err) {
      // err.response.data is our backend's error JSON:
      // { success: false, error: { message: "..." } }
      const msg = err.response?.data?.error?.message
                  || err.response?.data?.detail
                  || 'Login failed. Please try again.'
      setServerError(msg)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Navbar />

      {/* Full-height centered layout */}
      <div style={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '6rem 1.5rem 2rem',
      }}>
        {/* Auth card — uses our .card class from index.css */}
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
              fontSize:    '1.8rem',
              fontFamily:  'var(--font-heading)',
              fontWeight:  800,
              marginTop:   '0.75rem',
              marginBottom: '0.5rem',
            }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Sign in to continue your impact journey
            </p>
          </div>

          {/* Server error alert */}
          {serverError && (
            <div style={{
              background:   'rgba(239, 68, 68, 0.1)',
              border:       '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding:      '0.75rem 1rem',
              marginBottom: '1.5rem',
              color:        '#f87171',
              fontSize:     '0.875rem',
            }}>
              ⚠️ {serverError}
            </div>
          )}

          {/* Form — handleSubmit wraps our onSubmit with validation */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Email field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              {/* register("email", { rules }) connects this input to react-hook-form.
                  The rules object defines validation.
                  required: field cannot be empty
                  pattern: must match email regex */}
              <input
                type="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
                style={{ borderColor: errors.email ? 'var(--color-error)' : undefined }}
              />
              {/* errors.email is set by react-hook-form when validation fails */}
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            {/* Password field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
                style={{ borderColor: errors.password ? 'var(--color-error)' : undefined }}
              />
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {/* isSubmitting = true while the async API call is in progress */}
              {isSubmitting ? (
                <span style={{ display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center' }}>
                  <div className="spinner" style={{ width:'18px', height:'18px', borderWidth:'2px' }} />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          {/* Footer links */}
          <div style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color:'var(--color-primary-light)', fontWeight:600 }}>
              Create one free
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default Login
