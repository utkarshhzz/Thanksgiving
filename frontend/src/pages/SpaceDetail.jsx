import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { spacesApi } from '../api/spaces'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

// ── Booking modal ────────────────────────────────────────────────
function BookingModal({ space, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [serverError, setServerError] = useState(null)
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  const onSubmit = async (data) => {
    if (!isLoggedIn()) { navigate('/login'); return }
    setServerError(null)
    try {
      const res = await spacesApi.book(space.id, {
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime:   new Date(data.end_datetime).toISOString(),
        purpose:        data.purpose,
        attendee_count: parseInt(data.attendee_count),
      })
      onSuccess(res.data)
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Booking failed. Please try again.')
    }
  }

  const today = new Date().toISOString().slice(0, 16)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', damping: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(15,15,35,0.97)', border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '440px',
          boxShadow: '0 0 80px rgba(167,139,250,0.2)', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2rem' }}>📅</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginTop: '0.5rem' }}>
            Request Booking
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {space.name} · Up to {space.capacity} people
          </p>
        </div>

        {serverError && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.85rem',
          }}>
            ⚠️ {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Start Date & Time *</label>
            <input type="datetime-local" className="form-input" min={today}
              {...register('start_datetime', { required: 'Required' })}
              style={{ colorScheme: 'dark', borderColor: errors.start_datetime ? 'var(--color-error)' : undefined }}
            />
            {errors.start_datetime && <span className="form-error">{errors.start_datetime.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">End Date & Time *</label>
            <input type="datetime-local" className="form-input" min={today}
              {...register('end_datetime', { required: 'Required' })}
              style={{ colorScheme: 'dark', borderColor: errors.end_datetime ? 'var(--color-error)' : undefined }}
            />
            {errors.end_datetime && <span className="form-error">{errors.end_datetime.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Purpose *</label>
            <input className="form-input" placeholder="e.g. Charity fundraiser dinner"
              {...register('purpose', { required: 'Required', minLength: { value: 5, message: 'Minimum 5 characters' } })}
              style={{ borderColor: errors.purpose ? 'var(--color-error)' : undefined }}
            />
            {errors.purpose && <span className="form-error">{errors.purpose.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Expected Attendees *</label>
            <input type="number" min="1" max={space.capacity} className="form-input"
              placeholder={`Max ${space.capacity}`}
              {...register('attendee_count', {
                required: 'Required',
                min: { value: 1, message: 'Minimum 1' },
                max: { value: space.capacity, message: `Max capacity is ${space.capacity}` },
              })}
              style={{ borderColor: errors.attendee_count ? 'var(--color-error)' : undefined }}
            />
            {errors.attendee_count && <span className="form-error">{errors.attendee_count.message}</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 2 }}>
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  Requesting...
                </span>
              ) : 'Request Booking →'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Space detail page ────────────────────────────────────────────
function SpaceDetail() {
  const { id }                      = useParams()
  const [space, setSpace]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [booked, setBooked]         = useState(false)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const navigate   = useNavigate()

  useEffect(() => {
    spacesApi.get(id)
      .then(res => setSpace(res.data))
      .catch(() => navigate('/spaces'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )
  if (!space) return null

  const amenities = space.amenities ? space.amenities.split(',').map(a => a.trim()) : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/spaces" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← All Spaces
        </Link>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {space.space_type && (
            <span style={{ padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
              {space.space_type.replace('_', ' ')}
            </span>
          )}
          {space.city && (
            <span style={{ padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
              📍 {space.city}
            </span>
          )}
          <span style={{ padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: space.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: space.status === 'active' ? '#34d399' : '#94a3b8' }}>
            {space.status}
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '1.5rem',
        }}>
          {space.name}
        </h1>

        {/* Info grid */}
        <motion.div
          className="card card-glow"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.5rem' }}
        >
          {space.capacity && (
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Capacity</div>
              <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#a78bfa' }}>{space.capacity} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>people</span></div>
            </div>
          )}
          {space.address && (
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Address</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{space.address}</div>
            </div>
          )}
          {amenities.length > 0 && (
            <div style={{ gridColumn: amenities.length > 0 ? 'span 1' : undefined }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Amenities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {amenities.map(a => (
                  <span key={a} style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Book button */}
        {space.status === 'active' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ marginBottom: '2.5rem' }}>
            {booked ? (
              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
                color: '#a78bfa', textAlign: 'center', fontWeight: 600,
              }}>
                ✅ Booking request submitted! The host will review and confirm.
              </div>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}
                onClick={() => isLoggedIn() ? setShowBooking(true) : navigate('/login')}
              >
                📅 Request Booking
              </button>
            )}
          </motion.div>
        )}

        {/* Description */}
        {space.description && (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem', marginBottom: '1rem' }}>
              About this Space
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {space.description}
            </p>
          </motion.div>
        )}

        <SpaceReviews spaceId={id} />
      </div>

      <Footer />
    </motion.div>
  )
}

// ── Space Reviews Section ─────────────────────────────────────────
function SpaceReviews({ spaceId }) {
  const [reviews, setReviews]     = useState([])
  const [summary, setSummary]     = useState({ avg_rating: 0, total_reviews: 0 })
  const [rating, setRating]       = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const navigate   = useNavigate()

  const loadReviews = useCallback(async () => {
    if (!spaceId) return
    try {
      const [rList, rSum] = await Promise.all([
        api.get(`/spaces/${spaceId}/reviews`),
        api.get(`/spaces/${spaceId}/reviews/summary`),
      ])
      setReviews(rList.data || [])
      setSummary(rSum.data || {})
    } catch {}
  }, [spaceId])

  useEffect(() => { loadReviews() }, [loadReviews])

  const handleSubmitReview = async e => {
    e.preventDefault()
    if (!isLoggedIn()) { navigate('/login'); return }
    if (!reviewBody.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/spaces/${spaceId}/reviews`, { rating, body: reviewBody.trim() })
      setReviewBody('')
      setRating(5)
      await loadReviews()
      toast.success('Review submitted! ⭐')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not submit review'
      toast.error(msg)
    } finally { setSubmitting(false) }
  }

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem 4rem' }}>
      <div style={{ background: 'rgba(15,15,35,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '2rem', backdropFilter: 'blur(20px)' }}>
        {/* Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '3rem', color: '#f59e0b', lineHeight: 1 }}>{summary.avg_rating || '—'}</div>
            <div style={{ color: '#f59e0b', fontSize: '1.2rem', marginTop: '0.25rem' }}>{stars(Math.round(summary.avg_rating || 0))}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>Guest Reviews</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{summary.total_reviews || 0} review{summary.total_reviews !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Write review */}
        <form onSubmit={handleSubmitReview} style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: '14px' }}>
          <h4 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Leave a Review</h4>
          {/* Star picker */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.6rem', color: n <= rating ? '#f59e0b' : 'rgba(255,255,255,0.2)', padding: '0 2px', transition: 'color 0.15s' }}>
                ★
              </button>
            ))}
          </div>
          <textarea placeholder={isLoggedIn() ? 'Share your experience...' : 'Log in to write a review'}
            disabled={!isLoggedIn()} rows={3} value={reviewBody} onChange={e => setReviewBody(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', marginBottom: '0.75rem' }}
          />
          {isLoggedIn() && (
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !reviewBody.trim()} style={{ opacity: submitting || !reviewBody.trim() ? 0.6 : 1 }}>
              {submitting ? 'Posting...' : 'Submit Review'}
            </button>
          )}
        </form>

        {/* Review list */}
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
            <p style={{ fontSize: '0.88rem' }}>No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {(r.reviewer_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.reviewer_name}</span>
                      <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>{stars(r.rating)}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-faint)' }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {r.body && <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>{r.body}</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SpaceDetail
