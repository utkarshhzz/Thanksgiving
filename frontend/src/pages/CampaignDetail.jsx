import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { campaignApi } from '../api/campaigns'
import { aiApi } from '../api/ai'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

// ── Donate modal ─────────────────────────────────────────────────
function DonateModal({ campaign, onClose, onSuccess }) {
  const [amount, setAmount]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const navigate   = useNavigate()

  const quickAmounts = [100, 500, 1000, 5000]

  const handleDonate = async () => {
    if (!isLoggedIn()) { navigate('/login'); return }
    const num = parseFloat(amount)
    if (!num || num <= 0) { setError('Enter a valid amount'); return }

    setLoading(true); setError(null)
    try {
      // Try Razorpay payment flow first
      const orderRes = await campaignApi.createPaymentOrder(campaign.id, num)
      const { order_id, key_id, amount: amountPaise } = orderRes.data

      // Open Razorpay checkout popup (loaded via index.html script tag)
      const rzp = new window.Razorpay({
        key:         key_id,
        order_id:    order_id,
        amount:      amountPaise,
        currency:    'INR',
        name:        'ThankGiving',
        description: campaign.title,
        image:       campaign.image_url || '',
        theme:       { color: '#7c3aed' },
        prefill:     {},  // user details auto-filled by Razorpay from their account
        handler: async (response) => {
          // Payment complete — verify with backend + save donation
          try {
            await campaignApi.verifyPayment(campaign.id, {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              amount:              amountPaise,
            })
            onSuccess(num)
          } catch {
            setError('Payment verified but donation recording failed. Contact support.')
          }
        },
        modal: {
          ondismiss: () => setLoading(false),   // user closed popup without paying
        },
      })
      rzp.open()
    } catch (err) {
      // If backend returns 503 (Razorpay not configured), fall back to direct donate
      if (err.response?.status === 503) {
        try {
          await campaignApi.donate(campaign.id, num)
          onSuccess(num)
        } catch (fallbackErr) {
          setError(fallbackErr.response?.data?.error?.message || 'Donation failed')
          setLoading(false)
        }
      } else {
        setError(err.response?.data?.detail || err.response?.data?.error?.message || 'Payment failed')
        setLoading(false)
      }
    }
  }


  return (
    // Backdrop
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position:   'fixed',
        inset:      0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex:     2000,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:    '1.5rem',
      }}
    >
      {/* Modal card — stop click propagation so clicking inside doesn't close */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1,   opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background:   'rgba(15, 15, 35, 0.97)',
          border:       '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '24px',
          padding:      '2rem',
          width:        '100%',
          maxWidth:     '400px',
          boxShadow:    '0 0 80px rgba(124, 58, 237, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2rem' }}>💜</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginTop: '0.5rem' }}>
            Donate to this Campaign
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {campaign.title}
          </p>
        </div>

        {/* Quick amount chips */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
          {quickAmounts.map(q => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              style={{
                padding:      '0.4rem 0.9rem',
                borderRadius: '99px',
                fontSize:     '0.8rem',
                fontWeight:   600,
                cursor:       'pointer',
                transition:   'all 0.15s',
                background:   amount === String(q) ? 'var(--color-primary)' : 'rgba(124, 58, 237, 0.1)',
                color:        amount === String(q) ? 'white' : 'var(--color-primary-light)',
                border:       `1px solid ${amount === String(q) ? 'var(--color-primary)' : 'rgba(124, 58, 237, 0.3)'}`,
              }}
            >
              ₹{q}
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Custom Amount (₹)</label>
          <input
            type="number"
            className="form-input"
            placeholder="Enter amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="1"
            style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
            ⚠️ {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={handleDonate}
            className="btn btn-primary"
            disabled={loading || !amount}
            style={{ flex: 2 }}
          >
            {loading ? 'Processing...' : `Donate ₹${amount || '—'}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Campaign detail page ─────────────────────────────────────────
function CampaignDetail() {
  const { id }                  = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showDonate, setShowDonate] = useState(false)
  const [donated, setDonated]   = useState(false)
  const [updates, setUpdates]   = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [newUpdate, setNewUpdate] = useState({ title: '', body: '' })
  const [postingUpdate, setPostingUpdate] = useState(false)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const isOrgUser  = useAuthStore(s => s.isOrgUser)
  const navigate   = useNavigate()

  useEffect(() => {
    campaignApi.get(id)
      .then(res => setCampaign(res.data))
      .catch(() => navigate('/campaigns'))
      .finally(() => setLoading(false))
    // Load updates
    api.get(`/campaigns/${id}/updates`)
      .then(res => setUpdates(res.data))
      .catch(() => {})
  }, [id])

  const handlePostUpdate = async () => {
    if (!newUpdate.title || !newUpdate.body) return
    setPostingUpdate(true)
    try {
      const res = await api.post(`/campaigns/${id}/updates`, newUpdate)
      setUpdates(prev => [res.data, ...prev])
      setNewUpdate({ title: '', body: '' })
      toast.success('Update posted!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not post update')
    } finally {
      setPostingUpdate(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    const text = `Support "${campaign.title}" on ThankGiving!`
    if (navigator.share) {
      await navigator.share({ title: campaign.title, text, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  const loadSuggestions = async () => {
    if (suggestions.length > 0) return
    try {
      const res = await aiApi.suggestCampaigns(id)
      setSuggestions(res.data.suggestions || [])
    } catch { /* graceful fail */ }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )
  if (!campaign) return null

  const raised = campaign.total_raised ?? 0
  const goal   = campaign.goal_amount ?? 1
  const pct    = Math.min(Math.round((raised / goal) * 100), 100)
  const daysLeft = campaign.end_date
    ? Math.max(0, Math.ceil((new Date(campaign.end_date) - Date.now()) / 86400000))
    : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/campaigns" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← Back to campaigns
        </Link>

        {/* Status badge */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className={`badge badge-${campaign.status === 'active' ? 'success' : 'primary'}`}>
            {campaign.status}
          </span>
          {/* Share button */}
          <button onClick={handleShare}
            style={{
              padding: '4px 14px', borderRadius: '99px', fontSize: '0.75rem',
              fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            🔗 Share
          </button>
          {/* Twitter */}
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Support "${campaign.title}"`)}&url=${encodeURIComponent(window.location.href)}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              padding: '4px 14px', borderRadius: '99px', fontSize: '0.75rem',
              fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(29,161,242,0.3)',
              background: 'rgba(29,161,242,0.1)', color: '#60a5fa',
            }}
          >𝕏 Tweet</a>
          {/* WhatsApp */}
          <a href={`https://wa.me/?text=${encodeURIComponent(`Support "${campaign.title}" on ThankGiving: ${window.location.href}`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              padding: '4px 14px', borderRadius: '99px', fontSize: '0.75rem',
              fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(37,211,102,0.3)',
              background: 'rgba(37,211,102,0.1)', color: '#4ade80',
            }}
          >💬 WhatsApp</a>
        </div>

        {/* Campaign cover image */}
        {campaign.image_url && (
          <motion.img
            src={campaign.image_url}
            alt={campaign.title}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              width: '100%', height: '300px', objectFit: 'cover',
              borderRadius: '20px', marginBottom: '1.5rem', display: 'block',
            }}
          />
        )}

        <h1 style={{
          fontFamily:   'var(--font-heading)', fontWeight: 900,
          fontSize:     'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.15,
          marginBottom: '1.5rem', letterSpacing: '-0.02em',
        }}>
          {campaign.title}
        </h1>

        {/* Progress section */}
        <motion.div className="card card-glow"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <span style={{
              fontFamily: 'var(--font-heading)', fontWeight: 900,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>₹{raised.toLocaleString('en-IN')}</span>
            <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem', fontSize: '1rem' }}>
              raised of ₹{goal.toLocaleString('en-IN')} goal
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #7c3aed, #f59e0b)' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div><span style={{ fontWeight: 700 }}>{pct}%</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>funded</span></div>
            {daysLeft !== null && <div><span style={{ fontWeight: 700 }}>{daysLeft}</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>days left</span></div>}
            {campaign.donor_count != null && <div><span style={{ fontWeight: 700 }}>{campaign.donor_count}</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>donors</span></div>}
          </div>
        </motion.div>

        {/* Donate button */}
        {campaign.status === 'active' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ marginBottom: '2.5rem' }}
          >
            {donated ? (
              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399', textAlign: 'center', fontWeight: 600,
              }}>
                ✅ Thank you! Your donation has been recorded.
              </div>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
                onClick={() => isLoggedIn() ? setShowDonate(true) : navigate('/login')}
              >
                💜 Donate Now
              </button>
            )}
          </motion.div>
        )}

        {/* AI Suggestions — shown after donation */}
        {donated && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>
                ✨ You might also like
              </h3>
              {suggestions.length === 0 && (
                <button onClick={loadSuggestions}
                  style={{
                    padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem',
                    fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(124,58,237,0.3)',
                    background: 'rgba(124,58,237,0.1)', color: '#a78bfa',
                  }}
                >AI Suggest</button>
              )}
            </div>
            {suggestions.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Click "AI Suggest" to discover similar campaigns powered by Gemini AI.
              </p>
            ) : (
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {suggestions.map((s, i) => (
                  <li key={i} style={{ color: 'var(--color-text-muted)', fontSize: '0.87rem', lineHeight: 1.5 }}>{s}</li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {/* Description */}
        {campaign.description && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} className="card" style={{ marginBottom: '2rem' }}
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>
              About this campaign
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {campaign.description}
            </p>
          </motion.div>
        )}

        {/* Campaign Updates feed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.25rem' }}>
            📢 Campaign Updates
          </h2>

          {/* Post update form — only for org owner */}
          {isOrgUser() && (
            <div className="card" style={{ marginBottom: '1.5rem', border: '1px dashed rgba(124,58,237,0.3)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-text-muted)' }}>
                Post an update
              </h3>
              <input
                className="form-input"
                placeholder="Update title..."
                value={newUpdate.title}
                onChange={e => setNewUpdate(u => ({ ...u, title: e.target.value }))}
                style={{ marginBottom: '0.75rem' }}
              />
              <textarea
                className="form-input"
                placeholder="What's new with this campaign? Share progress, milestones, or news..."
                value={newUpdate.body}
                onChange={e => setNewUpdate(u => ({ ...u, body: e.target.value }))}
                rows={4}
                style={{ marginBottom: '0.75rem', resize: 'vertical' }}
              />
              <button onClick={handlePostUpdate} disabled={postingUpdate || !newUpdate.title || !newUpdate.body}
                className="btn btn-primary" style={{ width: '100%' }}
              >
                {postingUpdate ? 'Posting...' : '📢 Post Update'}
              </button>
            </div>
          )}

          {updates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)',
              background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <p style={{ fontSize: '0.88rem' }}>No updates yet. The campaign team will post progress here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {updates.map((u, i) => (
                <motion.div key={u.id}
                  initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  style={{
                    background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px', padding: '1.25rem', backdropFilter: 'blur(20px)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '1rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.97rem' }}>{u.title}</h3>
                    <span style={{ fontSize: '0.73rem', color: 'var(--color-text-faint)', flexShrink: 0 }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.87rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {u.body}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Comments section ── */}
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem 4rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'rgba(15,15,35,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '2rem', backdropFilter: 'blur(20px)' }}>
          <CommentsSection campaignId={campaign?.id} />
        </motion.div>
      </div>

      {/* Donate modal */}
      <AnimatePresence>
        {showDonate && (
          <DonateModal
            campaign={campaign}
            onClose={() => setShowDonate(false)}
            onSuccess={(amt) => {
              setShowDonate(false)
              setDonated(true)
              setCampaign(prev => ({ ...prev, total_raised: (prev.total_raised ?? 0) + amt }))
              loadSuggestions()
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Comments section component ───────────────────────────────────────
function CommentsSection({ campaignId }) {
  const [comments, setComments] = useState([])
  const [body, setBody]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const user       = useAuthStore(s => s.user)
  const navigate   = useNavigate()

  const loadComments = useCallback(async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const res = await api.get(`/campaigns/${campaignId}/comments?limit=30`)
      setComments(res.data)
    } catch {}
    finally { setLoading(false) }
  }, [campaignId])

  useEffect(() => { loadComments() }, [loadComments])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isLoggedIn()) { navigate('/login'); return }
    if (!body.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/campaigns/${campaignId}/comments`, { body: body.trim() })
      setBody('')
      await loadComments()
      toast.success('Comment posted!')
    } catch { toast.error('Failed to post comment') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/comments/${id}`)
      setComments(prev => prev.filter(c => c.id !== id))
    } catch { toast.error('Could not delete comment') }
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        💬 Discussion
        {comments.length > 0 && <span style={{ fontSize: '0.75rem', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', padding: '2px 10px', borderRadius: '99px', fontWeight: 700 }}>{comments.length}</span>}
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
        <textarea
          placeholder={isLoggedIn() ? 'Share your thoughts or ask a question...' : 'Log in to leave a comment'}
          disabled={!isLoggedIn()}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
        />
        {isLoggedIn() && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !body.trim()}
              style={{ opacity: submitting || !body.trim() ? 0.6 : 1 }}>
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        )}
      </form>

      {/* Comments list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💭</div>
          <p style={{ fontSize: '0.88rem' }}>No comments yet. Be the first to start the discussion!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ display: 'flex', gap: '0.85rem', padding: '1rem', background: c.is_pinned ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)', borderRadius: '12px', border: c.is_pinned ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgba(255,255,255,0.04)' }}>
              {/* Avatar */}
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {(c.author_name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.author_name}</span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-text-faint)' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {user && c.author_id === user.id && (
                      <button onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem', padding: 0 }}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CampaignDetail
