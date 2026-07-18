import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { volunteerApi } from '../api/volunteering'
import { useAuthStore } from '../store/authStore'

function OpportunityCard({ opp, index }) {
  const isExpired = opp.end_date && new Date(opp.end_date) < Date.now()
  const spotsLeft = opp.max_volunteers != null
    ? Math.max(0, opp.max_volunteers - (opp.applicant_count ?? 0))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      style={{
        background:     'rgba(15, 15, 35, 0.7)',
        border:         '1px solid rgba(255,255,255,0.07)',
        borderRadius:   '18px',
        overflow:       'hidden',
        backdropFilter: 'blur(20px)',
        display:        'flex',
        flexDirection:  'column',
      }}
    >
      {/* Green accent stripe */}
      <div style={{ height: '4px', background: isExpired ? '#475569' : 'linear-gradient(90deg, #10b981, transparent)' }} />

      <div style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Badges row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {opp.category && (
            <span style={{
              padding: '2px 10px', borderRadius: '99px',
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
            }}>
              {opp.category.replace('_', ' ')}
            </span>
          )}
          {opp.city && (
            <span style={{
              padding: '2px 10px', borderRadius: '99px',
              fontSize: '0.7rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)',
            }}>
              📍 {opp.city}
            </span>
          )}
          {isExpired && (
            <span style={{
              padding: '2px 10px', borderRadius: '99px',
              fontSize: '0.7rem', fontWeight: 700,
              background: 'rgba(71, 85, 105, 0.3)', color: '#94a3b8',
            }}>
              Closed
            </span>
          )}
        </div>

        <h3 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3,
        }}>
          {opp.title}
        </h3>

        {opp.description && (
          <p style={{
            color: 'var(--color-text-muted)', fontSize: '0.83rem', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1,
          }}>
            {opp.description}
          </p>
        )}

        {/* Info pills */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {opp.hours_per_week && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              ⏱ {opp.hours_per_week}h/week
            </span>
          )}
          {spotsLeft !== null && (
            <span style={{
              color: spotsLeft === 0 ? '#ef4444' : '#34d399',
              fontSize: '0.8rem', fontWeight: 600,
            }}>
              {spotsLeft === 0 ? 'Full' : `${spotsLeft} spots left`}
            </span>
          )}
          {opp.end_date && !isExpired && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Until {new Date(opp.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>

        <Link
          to={`/volunteer/${opp.id}`}
          style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            padding: '0.4rem 1rem', borderRadius: '99px',
            fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
            background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)', transition: 'all 0.2s',
          }}
        >
          View Details →
        </Link>
      </div>
    </motion.div>
  )
}

function Volunteer() {
  const [opps, setOpps]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [cityFilter, setCityFilter] = useState('all')

  useEffect(() => {
    volunteerApi.listOpportunities()
      .then(res => setOpps(res.data))
      .catch(() => setError('Could not load opportunities. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const cities   = ['all', ...new Set(opps.map(o => o.city).filter(Boolean))]
  const filtered = opps.filter(o => {
    const matchSearch = o.title.toLowerCase().includes(search.toLowerCase())
    const matchCity   = cityFilter === 'all' || o.city === cityFilter
    return matchSearch && matchCity
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 900,
            fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em',
          }}>
            Volunteer <span className="text-gradient">Opportunities</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Give your time, skills, and energy. Every hour counts.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}
        >
          <input
            className="form-input"
            placeholder="🔍  Search opportunities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          {cities.length > 1 && (
            <select
              className="form-input"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '150px', colorScheme: 'dark' }}
            >
              {cities.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>
              ))}
            </select>
          )}
        </motion.div>

        {/* States */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <p style={{ marginTop: '1rem' }}>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '3rem' }}>🙋</span>
            <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>No opportunities found</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {search ? 'Try a different search' : 'Check back soon — new opportunities are added weekly.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}>
            {filtered.map((o, i) => <OpportunityCard key={o.id} opp={o} index={i} />)}
          </div>
        )}
      <Footer />
      </div>
    </motion.div>
  )
}

export default Volunteer
