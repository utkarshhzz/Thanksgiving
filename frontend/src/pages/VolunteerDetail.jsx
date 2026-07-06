import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import { volunteerApi } from '../api/volunteering'
import { useAuthStore } from '../store/authStore'

function VolunteerDetail() {
  const { id }                  = useParams()
  const [opp, setOpp]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied]   = useState(false)
  const [error, setError]       = useState(null)

  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const navigate   = useNavigate()

  useEffect(() => {
    volunteerApi.getOpportunity(id)
      .then(res => setOpp(res.data))
      .catch(() => navigate('/volunteer'))
      .finally(() => setLoading(false))
  }, [id])

  const handleApply = async () => {
    if (!isLoggedIn()) { navigate('/login'); return }
    setApplying(true); setError(null)
    try {
      await volunteerApi.apply(id)
      setApplied(true)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not apply. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )
  if (!opp) return null

  const spotsLeft = opp.max_volunteers != null
    ? Math.max(0, opp.max_volunteers - (opp.applicant_count ?? 0))
    : null
  const isExpired = opp.end_date && new Date(opp.end_date) < Date.now()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/volunteer" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← All Opportunities
        </Link>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {opp.category && (
            <span style={{ padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
              {opp.category.replace('_', ' ')}
            </span>
          )}
          {opp.city && (
            <span style={{ padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
              📍 {opp.city}
            </span>
          )}
          {isExpired && (
            <span style={{ padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(71,85,105,0.3)', color: '#94a3b8' }}>
              Closed
            </span>
          )}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.15,
          letterSpacing: '-0.02em', marginBottom: '1.5rem',
        }}>
          {opp.title}
        </h1>

        {/* Info card */}
        <motion.div
          className="card card-glow"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem' }}
        >
          {opp.hours_per_week && (
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Commitment</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#34d399' }}>{opp.hours_per_week}h / week</div>
            </div>
          )}
          {spotsLeft !== null && (
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spots Available</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: spotsLeft === 0 ? '#ef4444' : '#34d399' }}>
                {spotsLeft === 0 ? 'Full' : `${spotsLeft} open`}
              </div>
            </div>
          )}
          {opp.end_date && (
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadline</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                {new Date(opp.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          )}
          {opp.applicant_count != null && (
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applicants</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{opp.applicant_count}</div>
            </div>
          )}
        </motion.div>

        {/* Apply button */}
        {!isExpired && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ marginBottom: '2.5rem' }}>
            {applied ? (
              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399', textAlign: 'center', fontWeight: 600,
              }}>
                ✅ Application submitted! The organization will review and contact you.
              </div>
            ) : (
              <>
                {error && (
                  <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                    ⚠️ {error}
                  </p>
                )}
                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  onClick={handleApply}
                  disabled={applying || spotsLeft === 0}
                >
                  {applying ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                      <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                      Submitting...
                    </span>
                  ) : spotsLeft === 0 ? 'No spots available' : '🙋 Apply to Volunteer'}
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Description */}
        {opp.description && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem', marginBottom: '1rem' }}>
              About this Opportunity
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {opp.description}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default VolunteerDetail
