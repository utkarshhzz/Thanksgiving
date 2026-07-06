import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import { spacesApi } from '../api/spaces'
import { useAuthStore } from '../store/authStore'

const BOOKING_STATUS = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  confirmed: { label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  rejected:  { label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  completed: { label: 'Completed', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'  },
}

function formatDateRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: true }
  return `${s.toLocaleDateString('en-IN', opts)}, ${s.toLocaleTimeString('en-IN', timeOpts)} – ${e.toLocaleTimeString('en-IN', timeOpts)}`
}

function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const isOrgUser = useAuthStore(s => s.isOrgUser)

  useEffect(() => {
    spacesApi.myBookings()
      .then(res => setBookings(res.data))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (bookingId) => {
    try {
      await spacesApi.updateBooking(bookingId, 'cancelled')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    } catch { /* silently fail */ }
  }

  const statuses = ['all', ...new Set(bookings.map(b => b.status))]
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.02em' }}>
            My Space <span className="text-gradient">Bookings</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            {isOrgUser()
              ? 'Track bookings for spaces you have requested.'
              : 'All space booking requests you have submitted.'}
          </p>
        </motion.div>

        {/* Filter pills */}
        {!loading && bookings.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}
          >
            {statuses.map(s => {
              const cfg = BOOKING_STATUS[s]
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', border: '1px solid', transition: 'all 0.2s',
                  background: filter === s ? (cfg?.bg ?? 'rgba(255,255,255,0.1)') : 'transparent',
                  borderColor: filter === s ? (cfg?.color ?? 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.1)',
                  color: filter === s ? (cfg?.color ?? 'white') : 'var(--color-text-muted)',
                }}>
                  {s === 'all' ? `All (${bookings.length})` : (cfg?.label ?? s)}
                </button>
              )
            })}
          </motion.div>
        )}

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}

        {!loading && bookings.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
            textAlign: 'center', padding: '5rem 1.5rem',
            background: 'rgba(15,15,35,0.5)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '3.5rem' }}>📅</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', margin: '1rem 0 0.5rem' }}>
              No bookings yet
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Browse available spaces and request a booking for your next event.
            </p>
            <Link to="/spaces" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
              Browse Spaces →
            </Link>
          </motion.div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map((booking, i) => {
              const s = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  style={{
                    background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '16px', padding: '1.4rem 1.5rem', backdropFilter: 'blur(20px)',
                    borderLeft: `3px solid ${s.color}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flexGrow: 1 }}>
                      {/* Space name + status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>
                          {booking.space_name ?? 'Space Booking'}
                        </h3>
                        <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </div>

                      {/* Purpose */}
                      {booking.purpose && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                          🎯 {booking.purpose}
                        </p>
                      )}

                      {/* Date range */}
                      {booking.start_datetime && (
                        <p style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem' }}>
                          📅 {formatDateRange(booking.start_datetime, booking.end_datetime)}
                        </p>
                      )}

                      {/* Attendees */}
                      {booking.attendee_count && (
                        <p style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                          👥 {booking.attendee_count} attendees
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      {booking.space_id && (
                        <Link
                          to={`/spaces/${booking.space_id}`}
                          style={{
                            padding: '0.35rem 0.85rem', borderRadius: '99px', fontSize: '0.78rem',
                            fontWeight: 600, textDecoration: 'none',
                            background: 'rgba(167,139,250,0.12)', color: '#a78bfa',
                            border: '1px solid rgba(167,139,250,0.25)',
                          }}
                        >
                          View Space →
                        </Link>
                      )}
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          style={{
                            padding: '0.35rem 0.85rem', borderRadius: '99px', fontSize: '0.78rem',
                            fontWeight: 600, cursor: 'pointer',
                            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                            color: '#f87171', transition: 'all 0.2s',
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default MyBookings
