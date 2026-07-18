import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { volunteerApi } from '../api/volunteering'

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  accepted: { label: 'Accepted',       color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  rejected: { label: 'Not Selected',   color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
  completed:{ label: 'Completed',      color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'  },
  withdrawn:{ label: 'Withdrawn',      color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
}

function MyApplications() {
  const [apps, setApps]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    volunteerApi.myApplications()    // GET /api/v1/applications/mine
      .then(res => setApplications(res.data ?? []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false))
  }, [])


  const statuses = ['all', ...new Set(apps.map(a => a.status))]
  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.02em' }}>
            My <span className="text-gradient">Applications</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Track all your volunteer opportunity applications.
          </p>
        </motion.div>

        {/* Status filter pills */}
        {!loading && apps.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}
          >
            {statuses.map(s => {
              const cfg = STATUS_CONFIG[s]
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', border: '1px solid', transition: 'all 0.2s',
                  background: filter === s ? (cfg?.bg ?? 'rgba(255,255,255,0.1)') : 'transparent',
                  borderColor: filter === s ? (cfg?.color ?? 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.1)',
                  color: filter === s ? (cfg?.color ?? 'white') : 'var(--color-text-muted)',
                }}>
                  {s === 'all' ? `All (${apps.length})` : (cfg?.label ?? s)}
                </button>
              )
            })}
          </motion.div>
        )}

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}

        {!loading && apps.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
            textAlign: 'center', padding: '5rem 1.5rem',
            background: 'rgba(15,15,35,0.5)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '3.5rem' }}>🙋</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', margin: '1rem 0 0.5rem' }}>
              No applications yet
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Apply to volunteer opportunities and track them here.
            </p>
            <Link to="/volunteer" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              Browse Opportunities →
            </Link>
          </motion.div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filtered.map((app, i) => {
              const s = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  style={{
                    background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px', padding: '1.25rem 1.5rem', backdropFilter: 'blur(20px)',
                    display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    borderLeft: `3px solid ${s.color}`,
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0,
                  }}>
                    🙋
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                      {app.opportunity_title ?? 'Volunteer Opportunity'}
                    </div>
                    <div style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem' }}>
                      Applied {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem',
                    fontWeight: 700, background: s.bg, color: s.color, flexShrink: 0,
                  }}>
                    {s.label}
                  </span>

                  {app.opportunity_id && (
                    <Link
                      to={`/volunteer/${app.opportunity_id}`}
                      style={{
                        padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem',
                        fontWeight: 600, textDecoration: 'none', flexShrink: 0,
                        background: 'rgba(16,185,129,0.12)', color: '#34d399',
                        border: '1px solid rgba(16,185,129,0.25)',
                      }}
                    >
                      View →
                    </Link>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      <Footer />
      </div>
    </motion.div>
  )
}

export default MyApplications
