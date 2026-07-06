import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'

import Navbar from '../components/Navbar.jsx'
import { volunteerApi } from '../api/volunteering'

function LogHours() {
  const [applications, setApplications] = useState([])  // accepted apps → can log hours for
  const [myHours, setMyHours]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [success, setSuccess]           = useState(false)
  const [serverError, setServerError]   = useState(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const totalHours = myHours.reduce((sum, h) => sum + (h.hours ?? 0), 0)

  useEffect(() => {
    Promise.allSettled([volunteerApi.myApplications(), volunteerApi.myHours()])
      .then(([appsRes, hoursRes]) => {
        if (appsRes.status === 'fulfilled') {
          // Only accepted applications can have hours logged
          setApplications(appsRes.value.data.filter(a => a.status === 'accepted'))
        }
        if (hoursRes.status === 'fulfilled') {
          setMyHours(hoursRes.value.data)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const res = await volunteerApi.logHours({
        opportunity_id: data.opportunity_id,
        hours:          parseFloat(data.hours),
        date:           data.date,
        notes:          data.notes || null,
        log_type:       'manual',
      })
      setMyHours(prev => [res.data, ...prev])
      setSuccess(true)
      reset()
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Could not log hours.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← Dashboard
        </Link>

        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Log <span className="text-gradient">Volunteer Hours</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>
          Manually record hours for your accepted volunteer positions.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: '2rem', alignItems: 'start' }}>

          {/* ── Log form ── */}
          <motion.div className="card card-glow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              ⏱ Add Entry
            </h2>

            {applications.length === 0 && !loading && (
              <div style={{
                padding: '1rem', borderRadius: '12px', background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d', fontSize: '0.85rem', marginBottom: '1.5rem',
              }}>
                ⚠️ You need an accepted volunteer application before logging hours.{' '}
                <Link to="/volunteer" style={{ color: '#fbbf24', fontWeight: 600 }}>Find opportunities →</Link>
              </div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '0.875rem', borderRadius: '12px', background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.875rem',
                  marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600,
                }}
              >
                ✅ Hours logged successfully!
              </motion.div>
            )}

            {serverError && (
              <div style={{
                padding: '0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem',
              }}>
                ⚠️ {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Opportunity selector */}
              <div className="form-group">
                <label className="form-label">Opportunity *</label>
                <select className="form-input" style={{ colorScheme: 'dark' }}
                  {...register('opportunity_id', { required: 'Select an opportunity' })}
                  disabled={applications.length === 0}
                  style={{ borderColor: errors.opportunity_id ? 'var(--color-error)' : undefined, colorScheme: 'dark' }}
                >
                  <option value="">Select opportunity...</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.opportunity_id}>
                      {app.opportunity_title ?? `Opportunity ${app.opportunity_id?.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                {errors.opportunity_id && <span className="form-error">{errors.opportunity_id.message}</span>}
              </div>

              {/* Hours + date side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Hours *</label>
                  <input type="number" step="0.5" min="0.5" max="24" className="form-input"
                    placeholder="2.5"
                    {...register('hours', {
                      required: 'Required',
                      min: { value: 0.5, message: 'Min 0.5h' },
                      max: { value: 24, message: 'Max 24h/day' },
                    })}
                    style={{ borderColor: errors.hours ? 'var(--color-error)' : undefined }}
                  />
                  {errors.hours && <span className="form-error">{errors.hours.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input"
                    max={new Date().toISOString().split('T')[0]}
                    {...register('date', { required: 'Required' })}
                    style={{ colorScheme: 'dark', borderColor: errors.date ? 'var(--color-error)' : undefined }}
                  />
                  {errors.date && <span className="form-error">{errors.date.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-input" rows={2} placeholder="What did you work on?"
                  {...register('notes')} style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary"
                disabled={isSubmitting || applications.length === 0}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                    Logging...
                  </span>
                ) : '+ Log Hours'}
              </button>
            </form>
          </motion.div>

          {/* ── Hours history ── */}
          <div>
            {/* Total badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px',
                padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
              }}
            >
              <div style={{ fontSize: '2rem' }}>⏱</div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Hours Logged</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '2rem', color: '#34d399' }}>
                  {totalHours.toFixed(1)}h
                </div>
              </div>
            </motion.div>

            {/* History list */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
            ) : myHours.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                No hours logged yet. Fill in the form to get started.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {myHours.map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    style={{
                      background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px', padding: '0.875rem 1.1rem', backdropFilter: 'blur(20px)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.2rem' }}>
                        {h.opportunity_title ?? 'Volunteer Hours'}
                      </div>
                      <div style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem' }}>
                        {h.date
                          ? new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        }
                        {h.notes && <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>· {h.notes}</span>}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#34d399', fontSize: '1rem', flexShrink: 0 }}>
                      +{h.hours}h
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default LogHours
