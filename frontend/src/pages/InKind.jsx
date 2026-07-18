import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'

import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { inKindApi } from '../api/inkind'
import { useAuthStore } from '../store/authStore'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  accepted:  { label: 'Accepted',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  rejected:  { label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  completed: { label: 'Completed', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'  },
}

function OfferCard({ offer, index, onCancel }) {
  const s = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.pending

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px', padding: '1.4rem', backdropFilter: 'blur(20px)',
        borderLeft: `3px solid ${s.color}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{
              padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700,
              background: s.bg, color: s.color,
            }}>
              {s.label}
            </span>
            {offer.item_category && (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                {offer.item_category.replace('_', ' ')}
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' }}>
            {offer.item_name}
          </h3>
          {offer.quantity && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.83rem' }}>
              Qty: {offer.quantity} {offer.unit && `${offer.unit}`}
            </p>
          )}
          <p style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem', marginTop: '0.3rem' }}>
            Offered {new Date(offer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {offer.status === 'pending' && (
          <button
            onClick={() => onCancel(offer.id)}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: '99px', fontSize: '0.78rem',
              fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)', color: '#f87171', transition: 'all 0.2s',
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── New offer modal ──────────────────────────────────────────────
function NewOfferModal({ onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [serverError, setServerError] = useState(null)

  const CATEGORIES = ['FOOD', 'CLOTHING', 'MEDICAL', 'ELECTRONICS', 'FURNITURE', 'BOOKS', 'OTHER']

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      // org_id is required by backend — for now we pass a placeholder;
      // real flow: user picks org from a list (future enhancement)
      const res = await inKindApi.create({
        item_name:     data.item_name,
        item_category: data.item_category,
        quantity:      parseInt(data.quantity),
        unit:          data.unit || null,
        description:   data.description || null,
        org_id:        data.org_id,
      })
      onSuccess(res.data)
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Could not submit offer.')
    }
  }

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
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(15,15,35,0.97)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '460px',
          boxShadow: '0 0 80px rgba(245,158,11,0.2)', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2rem' }}>📦</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginTop: '0.5rem' }}>
            Make a Donation Offer
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Offer goods directly to a verified nonprofit
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
            <label className="form-label">Organization ID *</label>
            <input className="form-input" placeholder="Paste org ID from their profile"
              {...register('org_id', { required: 'Required' })}
              style={{ borderColor: errors.org_id ? 'var(--color-error)' : undefined }}
            />
            {errors.org_id && <span className="form-error">{errors.org_id.message}</span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
              (Org selection UI coming — paste org UUID for now)
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input className="form-input" placeholder="e.g. Winter Blankets"
              {...register('item_name', { required: 'Item name is required' })}
              style={{ borderColor: errors.item_name ? 'var(--color-error)' : undefined }}
            />
            {errors.item_name && <span className="form-error">{errors.item_name.message}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-input" style={{ colorScheme: 'dark' }}
                {...register('item_category', { required: true })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input type="number" min="1" className="form-input" placeholder="10"
                {...register('quantity', { required: 'Required', min: { value: 1, message: 'Min 1' } })}
                style={{ borderColor: errors.quantity ? 'var(--color-error)' : undefined }}
              />
              {errors.quantity && <span className="form-error">{errors.quantity.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Unit (optional)</label>
            <input className="form-input" placeholder="e.g. kg, boxes, pieces"
              {...register('unit')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-input" rows={3} placeholder="Condition, pickup details, etc."
              {...register('description')} style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={isSubmitting} style={{ flex: 2 }}>
              {isSubmitting ? 'Submitting...' : 'Submit Offer →'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Main In-Kind page ────────────────────────────────────────────
function InKind() {
  const [offers, setOffers]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const navigate   = useNavigate()

  useEffect(() => {
    inKindApi.myOffers()
      .then(res => setOffers(res.data))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    try {
      await inKindApi.updateStatus(id, 'cancelled')
      setOffers(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    } catch { /* silently ignore */ }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em',
              }}>
                In-Kind <span className="text-gradient">Donations</span>
              </h1>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Donate goods directly to nonprofits — tracked from offer to delivery.
              </p>
            </div>
            <button
              className="btn btn-accent"
              onClick={() => isLoggedIn() ? setShowModal(true) : navigate('/login')}
            >
              + Make an Offer
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        ) : offers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '5rem 1.5rem',
              background: 'rgba(15,15,35,0.5)', borderRadius: '20px',
              border: '1px dashed rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: '3.5rem' }}>📦</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', margin: '1rem 0 0.5rem' }}>
              No offers yet
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Your in-kind donation offers will appear here once submitted.
            </p>
            <button className="btn btn-accent"
              onClick={() => isLoggedIn() ? setShowModal(true) : navigate('/login')}
            >
              Make Your First Offer →
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {offers.map((o, i) => (
              <OfferCard key={o.id} offer={o} index={i} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <NewOfferModal
            onClose={() => setShowModal(false)}
            onSuccess={(newOffer) => {
              setShowModal(false)
              setOffers(prev => [newOffer, ...prev])
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default InKind
