import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import { campaignApi } from '../api/campaigns'
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
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const navigate   = useNavigate()

  useEffect(() => {
    campaignApi.get(id)
      .then(res => setCampaign(res.data))
      .catch(() => navigate('/campaigns'))
      .finally(() => setLoading(false))
  }, [id])

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
        <div style={{ marginBottom: '1rem' }}>
          <span className={`badge badge-${campaign.status === 'active' ? 'success' : 'primary'}`}>
            {campaign.status}
          </span>
        </div>

        {/* Campaign cover image (only rendered if uploaded) */}
        {campaign.image_url && (
          <motion.img
            src={campaign.image_url}
            alt={campaign.title}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              width:        '100%',
              height:       '300px',
              objectFit:    'cover',
              borderRadius: '20px',
              marginBottom: '1.5rem',
              display:      'block',
            }}
          />
        )}

        <h1 style={{
          fontFamily:   'var(--font-heading)',
          fontWeight:   900,
          fontSize:     'clamp(1.8rem, 4vw, 2.8rem)',
          lineHeight:   1.15,
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em',
        }}>
          {campaign.title}
        </h1>

        {/* Progress section */}
        <motion.div
          className="card card-glow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ marginBottom: '2rem' }}
        >
          {/* Big amount */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{
              fontFamily:  'var(--font-heading)',
              fontWeight:  900,
              fontSize:    'clamp(2rem, 5vw, 3rem)',
              background:  'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              backgroundClip: 'text',
            }}>
              ₹{raised.toLocaleString('en-IN')}
            </span>
            <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem', fontSize: '1rem' }}>
              raised of ₹{goal.toLocaleString('en-IN')} goal
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #7c3aed, #f59e0b)' }}
            />
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div><span style={{ fontWeight: 700 }}>{pct}%</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>funded</span></div>
            {daysLeft !== null && <div><span style={{ fontWeight: 700 }}>{daysLeft}</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>days left</span></div>}
            {campaign.donor_count != null && <div><span style={{ fontWeight: 700 }}>{campaign.donor_count}</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>donors</span></div>}
          </div>
        </motion.div>

        {/* Donate button */}
        {campaign.status === 'active' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ marginBottom: '2.5rem' }}
          >
            {donated ? (
              <div style={{
                padding:      '1.25rem',
                borderRadius: '14px',
                background:   'rgba(16, 185, 129, 0.1)',
                border:       '1px solid rgba(16, 185, 129, 0.3)',
                color:        '#34d399',
                textAlign:    'center',
                fontWeight:   600,
              }}>
                ✅ Thank you! Your donation has been recorded.
              </div>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={() => isLoggedIn() ? setShowDonate(true) : navigate('/login')}
              >
                💜 Donate Now
              </button>
            )}
          </motion.div>
        )}

        {/* Description */}
        {campaign.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>
              About this campaign
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {campaign.description}
            </p>
          </motion.div>
        )}
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
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default CampaignDetail
