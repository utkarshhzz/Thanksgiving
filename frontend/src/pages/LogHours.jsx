import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'

import Navbar from '../components/Navbar.jsx'
import { volunteerApi } from '../api/volunteering'
import { useAuthStore } from '../store/authStore'

// ── Tab button ────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1.25rem', borderRadius: '99px', border: 'none',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem',
        background: active ? '#10b981' : 'rgba(255,255,255,0.05)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  )
}

function LogHours() {
  const user = useAuthStore(s => s.user)
  const isOrgUser = useAuthStore(s => s.isOrgUser)

  const [applications, setApplications] = useState([])
  const [myHours, setMyHours]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [success, setSuccess]           = useState(false)
  const [serverError, setServerError]   = useState(null)
  const [activeTab, setActiveTab]       = useState('manual')  // 'manual' | 'qr-volunteer' | 'qr-org'

  // QR state — Volunteer side
  const [qrToken, setQrToken]           = useState('')
  const [qrAction, setQrAction]         = useState('checkin')  // 'checkin' | 'checkout'
  const [qrLoading, setQrLoading]       = useState(false)
  const [qrResult, setQrResult]         = useState(null)
  const [qrDescription, setQrDescription] = useState('')

  // QR state — Org side (generate QR)
  const [orgOpportunities, setOrgOpportunities] = useState([])
  const [selectedOppId, setSelectedOppId]       = useState('')
  const [generatedQr, setGeneratedQr]           = useState(null)
  const [qrGenLoading, setQrGenLoading]         = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()
  const totalHours = myHours.reduce((sum, h) => sum + parseFloat(h.hours_logged ?? 0), 0)

  useEffect(() => {
    Promise.allSettled([volunteerApi.myApplications(), volunteerApi.myHours()])
      .then(([appsRes, hoursRes]) => {
        if (appsRes.status === 'fulfilled') {
          const accepted = appsRes.value.data.filter(a => a.status === 'approved' || a.status === 'accepted')
          setApplications(accepted)
        }
        if (hoursRes.status === 'fulfilled') setMyHours(hoursRes.value.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Manual log submit ─────────────────────────────────────────────
  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const res = await volunteerApi.logHours({
        opportunity_id: data.opportunity_id,
        hours_logged:   parseFloat(data.hours),
        log_date:       data.date,
        description:    data.notes || null,
      })
      setMyHours(prev => [res.data, ...prev])
      setSuccess(true)
      reset()
      toast.success('Hours logged! ✅')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setServerError(err.response?.data?.error?.message || err.response?.data?.detail || 'Could not log hours.')
    }
  }

  // ── QR Check-in / Check-out (volunteer) ──────────────────────────
  const handleQrAction = async () => {
    if (!qrToken.trim()) { toast.error('Paste the QR token first.'); return }
    setQrLoading(true)
    setQrResult(null)
    try {
      let res
      if (qrAction === 'checkin') {
        res = await volunteerApi.qrCheckin(qrToken.trim())
        toast.success('Checked in! ✅ Come back and scan again to check out.')
      } else {
        res = await volunteerApi.qrCheckout(qrToken.trim(), qrDescription || null)
        const hours = parseFloat(res.data.hours_logged ?? 0)
        toast.success(`Checked out! ${hours.toFixed(2)}h logged automatically ✅`)
        setMyHours(prev => [res.data, ...prev])
      }
      setQrResult(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'QR action failed.')
    } finally {
      setQrLoading(false)
    }
  }

  // ── Generate QR for org ───────────────────────────────────────────
  const handleGenerateQr = async () => {
    if (!selectedOppId) { toast.error('Select an opportunity first.'); return }
    setQrGenLoading(true)
    setGeneratedQr(null)
    try {
      const res = await volunteerApi.generateQrToken(selectedOppId)
      setGeneratedQr(res.data)
      toast.success('QR code generated! Show it to volunteers.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not generate QR.')
    } finally {
      setQrGenLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← Dashboard
        </Link>

        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Log <span className="text-gradient">Volunteer Hours</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
          Manually record hours or use QR check-in for automatic tracking.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <Tab label="⏱ Manual Log"      active={activeTab === 'manual'}       onClick={() => setActiveTab('manual')} />
          <Tab label="📱 QR Check-in"    active={activeTab === 'qr-volunteer'} onClick={() => setActiveTab('qr-volunteer')} />
          {isOrgUser?.() && (
            <Tab label="🏛️ Generate QR (Org)" active={activeTab === 'qr-org'} onClick={() => setActiveTab('qr-org')} />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: '2rem', alignItems: 'start' }}>

          {/* ── LEFT: Form (tab-dependent) ── */}
          <motion.div className="card card-glow" key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* ── MANUAL TAB ── */}
            {activeTab === 'manual' && (
              <>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                  ⏱ Add Entry
                </h2>

                {applications.length === 0 && !loading && (
                  <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    ⚠️ You need an approved volunteer application before logging hours.{' '}
                    <Link to="/volunteer" style={{ color: '#fbbf24', fontWeight: 600 }}>Find opportunities →</Link>
                  </div>
                )}

                {success && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '0.875rem', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>
                    ✅ Hours logged successfully!
                  </motion.div>
                )}
                {serverError && (
                  <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    ⚠️ {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Opportunity *</label>
                    <select className="form-input" style={{ colorScheme: 'dark' }}
                      {...register('opportunity_id', { required: 'Select an opportunity' })}
                      disabled={applications.length === 0}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Hours *</label>
                      <input type="number" step="0.5" min="0.5" max="24" className="form-input" placeholder="2.5"
                        {...register('hours', { required: 'Required', min: { value: 0.5, message: 'Min 0.5h' }, max: { value: 24, message: 'Max 24h' } })}
                        style={{ borderColor: errors.hours ? 'var(--color-error)' : undefined }}
                      />
                      {errors.hours && <span className="form-error">{errors.hours.message}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date *</label>
                      <input type="date" className="form-input" max={new Date().toISOString().split('T')[0]}
                        {...register('date', { required: 'Required' })} style={{ colorScheme: 'dark' }} />
                      {errors.date && <span className="form-error">{errors.date.message}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea className="form-input" rows={2} placeholder="What did you work on?" {...register('notes')} style={{ resize: 'vertical' }} />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={isSubmitting || applications.length === 0}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    {isSubmitting ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Logging...
                      </span>
                    ) : '+ Log Hours'}
                  </button>
                </form>
              </>
            )}

            {/* ── QR CHECK-IN TAB (Volunteer) ── */}
            {activeTab === 'qr-volunteer' && (
              <>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  📱 QR Check-in
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Scan the org's QR code to check in, then scan again when you leave to auto-log your hours.
                </p>

                {/* Check-in / Check-out toggle */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {['checkin', 'checkout'].map(act => (
                    <button key={act} onClick={() => setQrAction(act)} style={{
                      flex: 1, padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s',
                      background: qrAction === act ? '#10b981' : 'rgba(255,255,255,0.05)',
                      color: qrAction === act ? 'white' : 'var(--color-text-muted)',
                    }}>
                      {act === 'checkin' ? '✅ Check In' : '🏁 Check Out'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">QR Token (paste from coordinator)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Paste the token from the QR code here..."
                      value={qrToken}
                      onChange={e => setQrToken(e.target.value)}
                      style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    />
                  </div>

                  {qrAction === 'checkout' && (
                    <div className="form-group">
                      <label className="form-label">What did you do? (optional)</label>
                      <input className="form-input" placeholder="e.g. Packed boxes, helped register donors"
                        value={qrDescription} onChange={e => setQrDescription(e.target.value)} />
                    </div>
                  )}

                  <button onClick={handleQrAction} disabled={qrLoading} className="btn btn-primary"
                    style={{ background: qrAction === 'checkin' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                    {qrLoading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                        {qrAction === 'checkin' ? 'Checking in...' : 'Checking out...'}
                      </span>
                    ) : qrAction === 'checkin' ? '✅ Check In Now' : '🏁 Check Out & Log Hours'}
                  </button>
                </div>

                {/* QR Result */}
                <AnimatePresence>
                  {qrResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '0.4rem' }}>
                        {qrAction === 'checkin' ? '✅ Checked In!' : `🏁 ${parseFloat(qrResult.hours_logged ?? 0).toFixed(2)}h logged automatically`}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        {qrAction === 'checkin'
                          ? 'Remember to scan again when you leave!'
                          : 'Hours auto-verified — no coordinator approval needed.'}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* ── GENERATE QR TAB (Org) ── */}
            {activeTab === 'qr-org' && (
              <>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  🏛️ Generate Event QR
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Generate a QR code for volunteers to scan at your event. Valid for 24 hours.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Your Opportunities</label>
                    <select className="form-input" style={{ colorScheme: 'dark' }}
                      value={selectedOppId} onChange={e => { setSelectedOppId(e.target.value); setGeneratedQr(null) }}>
                      <option value="">Select opportunity...</option>
                      {applications.map(app => (
                        <option key={app.id} value={app.opportunity_id}>
                          {app.opportunity_title ?? `Opportunity ${app.opportunity_id?.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button onClick={handleGenerateQr} disabled={qrGenLoading || !selectedOppId} className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                    {qrGenLoading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Generating...
                      </span>
                    ) : '⚡ Generate QR Code'}
                  </button>
                </div>

                {/* Generated QR display */}
                <AnimatePresence>
                  {generatedQr && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '16px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', textAlign: 'center' }}>
                      <div style={{ display: 'inline-block', padding: '16px', background: 'white', borderRadius: '12px', marginBottom: '1rem' }}>
                        <QRCodeSVG value={generatedQr.qr_token} size={200} level="H" />
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        ⏱ Expires in {generatedQr.expires_in_hours}h · Show this to volunteers
                      </div>
                      <details style={{ textAlign: 'left', marginTop: '0.75rem' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Show raw token</summary>
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all', color: '#a78bfa' }}>
                          {generatedQr.qr_token}
                        </div>
                      </details>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>

          {/* ── RIGHT: Hours history ── */}
          <div>
            {/* Total badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
                {myHours.map((h, i) => (
                  <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    style={{ background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.875rem 1.1rem', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {h.log_method === 'qr_checkin' ? <span title="QR check-in">📱</span> : <span title="Manual">✏️</span>}
                        {h.opportunity_title ?? 'Volunteer Hours'}
                      </div>
                      <div style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem' }}>
                        {h.log_date
                          ? new Date(h.log_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        }
                        {h.description && <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>· {h.description}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#34d399', fontSize: '1rem', flexShrink: 0 }}>
                        +{parseFloat(h.hours_logged ?? 0).toFixed(1)}h
                      </span>
                      <span style={{
                        fontSize: '0.65rem', padding: '1px 6px', borderRadius: '99px', fontWeight: 700,
                        background: h.verification_status === 'verified' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: h.verification_status === 'verified' ? '#34d399' : '#fcd34d',
                      }}>
                        {h.verification_status ?? 'pending'}
                      </span>
                    </div>
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
