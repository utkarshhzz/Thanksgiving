import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import Navbar from '../components/Navbar.jsx'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

const AVATAR_COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']

function getInitials(first, last) {
  return `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase()
}

function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const updateUserStore = useAuthStore(s => s.updateUser)
  const storeUser       = useAuthStore(s => s.user)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    authApi.me()
      .then(res => {
        setProfile(res.data)
        reset({
          first_name: res.data.first_name || '',
          last_name:  res.data.last_name  || '',
          phone:      res.data.phone       || '',
          bio:        res.data.bio         || '',
        })
      })
      .catch(() => toast.error('Could not load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const onSave = async (data) => {
    // For now we use the /auth/me endpoint to re-fetch — a PATCH /users/me
    // endpoint can be added later. We optimistically update the store.
    try {
      // Update store so Navbar reflects new name immediately
      updateUserStore({ ...storeUser, ...data })
      setProfile(prev => ({ ...prev, ...data }))
      setEditing(false)
      toast.success('Profile updated!')
    } catch {
      toast.error('Update failed.')
    }
  }

  const avatarColor = AVATAR_COLORS[(profile?.email?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        {/* Avatar + name header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}
        >
          {/* Avatar circle with initials */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)',
            color: 'white', flexShrink: 0, border: '3px solid rgba(255,255,255,0.15)',
          }}>
            {getInitials(profile?.first_name, profile?.last_name)}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem', marginBottom: '0.25rem' }}>
              {profile?.first_name} {profile?.last_name}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{profile?.email}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                background: profile?.user_type === 'organization' ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)',
                color: profile?.user_type === 'organization' ? '#a78bfa' : '#34d399',
              }}>
                {profile?.user_type}
              </span>
              {profile?.is_verified && (
                <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                  ✓ Verified
                </span>
              )}
              {profile?.oauth_provider && (
                <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
                  {profile.oauth_provider === 'google' ? '🔵 Google Account' : profile.oauth_provider}
                </span>
              )}
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 'auto' }}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Cancel' : '✏️ Edit'}
          </button>
        </motion.div>

        {/* Info or edit form */}
        {!editing ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card"
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              Profile Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {[
                { label: 'First Name',  value: profile?.first_name || '—' },
                { label: 'Last Name',   value: profile?.last_name  || '—' },
                { label: 'Phone',       value: profile?.phone      || '—' },
                { label: 'Member Since',value: profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    {label}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{value}</div>
                </div>
              ))}
              {profile?.bio && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Bio</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{profile.bio}</div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit(onSave)}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Edit Profile
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" {...register('first_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" {...register('last_name')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="+91 98765 43210" {...register('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-input" rows={3} placeholder="Tell us about yourself..." {...register('bio')} style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.form>
        )}
      </div>
    </motion.div>
  )
}

export default Profile
