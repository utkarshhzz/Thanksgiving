import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import { campaignApi } from '../api/campaigns'

function MyDonations() {
  const [donations, setDonations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [total, setTotal]         = useState(0)

  useEffect(() => {
    campaignApi.myDonations()
      .then(res => {
        const data = res.data
        setDonations(data)
        setTotal(data.reduce((sum, d) => sum + (d.amount ?? 0), 0))
      })
      .catch(() => setDonations([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.02em' }}>
            My <span className="text-gradient">Donations</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Your complete donation history with impact tracking.
          </p>
        </motion.div>

        {/* Summary card */}
        {!loading && donations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{
              background:   'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(245,158,11,0.08))',
              border:       '1px solid rgba(124,58,237,0.25)',
              borderRadius: '18px',
              padding:      '1.75rem',
              marginBottom: '2rem',
              display:      'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap:          '1.5rem',
            }}
          >
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                Total Given
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem',
                background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                ₹{total.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                Campaigns Supported
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem', color: '#a78bfa' }}>
                {new Set(donations.map(d => d.campaign_id)).size}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                Total Transactions
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem', color: '#34d399' }}>
                {donations.length}
              </div>
            </div>
          </motion.div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && donations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '5rem 1.5rem',
              background: 'rgba(15,15,35,0.5)', borderRadius: '20px',
              border: '1px dashed rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: '3.5rem' }}>💰</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', margin: '1rem 0 0.5rem' }}>
              No donations yet
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Your donation history will appear here once you contribute to a campaign.
            </p>
            <Link to="/campaigns" className="btn btn-primary">Browse Campaigns →</Link>
          </motion.div>
        )}

        {!loading && donations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {donations.map((donation, i) => (
              <motion.div
                key={donation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background:     'rgba(15,15,35,0.7)',
                  border:         '1px solid rgba(255,255,255,0.07)',
                  borderRadius:   '14px',
                  padding:        '1.25rem 1.5rem',
                  backdropFilter: 'blur(20px)',
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '1rem',
                  flexWrap:       'wrap',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(124,58,237,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                }}>
                  💜
                </div>

                {/* Info */}
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                    {donation.campaign_title ?? 'Campaign Donation'}
                  </div>
                  <div style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem' }}>
                    {new Date(donation.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {/* Amount */}
                <div style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem',
                  color: '#a78bfa', flexShrink: 0,
                }}>
                  ₹{(donation.amount ?? 0).toLocaleString('en-IN')}
                </div>

                {/* Link to campaign */}
                {donation.campaign_id && (
                  <Link
                    to={`/campaigns/${donation.campaign_id}`}
                    style={{
                      padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem',
                      fontWeight: 600, textDecoration: 'none', flexShrink: 0,
                      background: 'rgba(124,58,237,0.12)', color: 'var(--color-primary-light)',
                      border: '1px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    View →
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default MyDonations
