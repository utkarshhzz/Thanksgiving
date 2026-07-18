import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'

import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar.jsx'

function Register() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const [serverError, setServerError] = useState(null)
  const login    = useAuthStore(s => s.login)
  const navigate = useNavigate()

  // watch("password") returns the LIVE value of the password field.
  // We use it so the confirmPassword rule can compare against it.
  const password = watch('password')

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      // Step 1: Register → get token back
      const regRes = await api.post('/auth/register', {
        email:      data.email,
        password:   data.password,
        first_name: data.first_name,
        last_name:  data.last_name,
        user_type:  data.user_type,
      })

      const { access_token, user } = regRes.data
      login(access_token, user)
      navigate('/onboarding')  // Show onboarding wizard for new users

    } catch (err) {
      const msg = err.response?.data?.error?.message
                  || err.response?.data?.detail
                  || 'Registration failed. Please try again.'
      setServerError(msg)
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
          style={{ width: '100%', maxWidth: '480px' }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <span style={{ fontSize:'2.5rem' }}>✨</span>
            <h1 style={{ fontSize:'1.8rem', fontFamily:'var(--font-heading)', fontWeight:800, marginTop:'0.75rem', marginBottom:'0.5rem' }}>
              Create your account
            </h1>
            <p style={{ color:'var(--color-text-muted)', fontSize:'0.9rem' }}>
              Join India's largest social good network
            </p>
          </div>

          {serverError && (
            <div style={{
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', marginBottom:'1.5rem',
              color:'#f87171', fontSize:'0.875rem',
            }}>
              ⚠️ {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>

            {/* Name row — two fields side by side */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" placeholder="Arjun"
                  {...register('first_name', { required: 'Required' })}
                  style={{ borderColor: errors.first_name ? 'var(--color-error)' : undefined }}
                />
                {errors.first_name && <span className="form-error">{errors.first_name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" placeholder="Sharma"
                  {...register('last_name', { required: 'Required' })}
                  style={{ borderColor: errors.last_name ? 'var(--color-error)' : undefined }}
                />
                {errors.last_name && <span className="form-error">{errors.last_name.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="arjun@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value:/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message:'Valid email required' }
                })}
                style={{ borderColor: errors.email ? 'var(--color-error)' : undefined }}
              />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="At least 8 characters"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value:8, message:'Minimum 8 characters' }
                })}
                style={{ borderColor: errors.password ? 'var(--color-error)' : undefined }}
              />
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" placeholder="Same password again"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  // validate: custom rule. value = what user typed.
                  // If it doesn't match the watched password → error.
                  validate: value => value === password || 'Passwords do not match'
                })}
                style={{ borderColor: errors.confirmPassword ? 'var(--color-error)' : undefined }}
              />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
            </div>

            {/* Account type — radio buttons styled as cards */}
            <div className="form-group">
              <label className="form-label">I am a...</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                {[
                  { value:'INDIVIDUAL',   label:'Individual', icon:'👤', sub:'Donor or Volunteer' },
                  { value:'ORGANIZATION', label:'Organization', icon:'🏢', sub:'NGO or Nonprofit' },
                ].map(type => (
                  <label key={type.value} style={{ cursor:'pointer' }}>
                    <input type="radio" value={type.value}
                      {...register('user_type', { required: 'Please select account type' })}
                      style={{ display:'none' }}  // hide the native radio button
                    />
                    {/* The visible styled "radio card" */}
                    <div className="card" style={{
                      textAlign:   'center',
                      padding:     '1rem',
                      cursor:      'pointer',
                      transition:  'all 0.2s',
                    }}>
                      <div style={{ fontSize:'1.5rem' }}>{type.icon}</div>
                      <div style={{ fontWeight:600, fontSize:'0.9rem', marginTop:'0.25rem' }}>{type.label}</div>
                      <div style={{ color:'var(--color-text-muted)', fontSize:'0.75rem' }}>{type.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.user_type && <span className="form-error">{errors.user_type.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width:'100%', padding:'0.875rem', fontSize:'1rem', marginTop:'0.5rem' }}
            >
              {isSubmitting ? (
                <span style={{ display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center' }}>
                  <div className="spinner" style={{ width:'18px', height:'18px', borderWidth:'2px' }} />
                  Creating account...
                </span>
              ) : 'Create Account →'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'var(--color-primary-light)', fontWeight:600 }}>Sign in</Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default Register
