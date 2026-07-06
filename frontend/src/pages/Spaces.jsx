import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'

import Navbar from '../components/Navbar.jsx'
import { spacesApi } from '../api/spaces'
import { useAuthStore } from '../store/authStore'

// ── Space card ───────────────────────────────────────────────────
function SpaceCard({ space, index }) {
  const amenities = space.amenities ? space.amenities.split(',').map(a => a.trim()) : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      style={{
        background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #a78bfa, transparent)' }} />

      <div style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Type + City */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {space.space_type && (
            <span style={{
              padding: '2px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
            }}>
              {space.space_type.replace('_', ' ')}
            </span>
          )}
          {space.city && (
            <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
              📍 {space.city}
            </span>
          )}
        </div>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }}>
          {space.name}
        </h3>

        {space.description && (
          <p style={{
            color: 'var(--color-text-muted)', fontSize: '0.83rem', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1,
          }}>
            {space.description}
          </p>
        )}

        {/* Capacity + amenities */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {space.capacity && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              👥 Up to {space.capacity} people
            </span>
          )}
          {amenities.slice(0, 3).map(a => (
            <span key={a} style={{
              padding: '1px 8px', borderRadius: '6px', fontSize: '0.72rem',
              background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)',
            }}>
              {a}
            </span>
          ))}
          {amenities.length > 3 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)' }}>+{amenities.length - 3} more</span>
          )}
        </div>

        <Link
          to={`/spaces/${space.id}`}
          style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            padding: '0.4rem 1rem', borderRadius: '99px',
            fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
            background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
            border: '1px solid rgba(167,139,250,0.3)', transition: 'all 0.2s',
          }}
        >
          View & Book →
        </Link>
      </div>
    </motion.div>
  )
}

// ── Spaces browse page ───────────────────────────────────────────
function Spaces() {
  const [spaces, setSpaces]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [cityFilter, setCityFilter] = useState('all')

  const isOrgUser = useAuthStore(s => s.isOrgUser)

  useEffect(() => {
    spacesApi.list()
      .then(res => setSpaces(res.data))
      .catch(() => setError('Could not load spaces.'))
      .finally(() => setLoading(false))
  }, [])

  const cities   = ['all', ...new Set(spaces.map(s => s.city).filter(Boolean))]
  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    (cityFilter === 'all' || s.city === cityFilter)
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em',
              }}>
                Available <span className="text-gradient">Spaces</span>
              </h1>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Book halls, offices, and warehouses for nonprofit events.
              </p>
            </div>
            {isOrgUser() && (
              <Link to="/spaces/new" className="btn btn-primary">+ List Your Space</Link>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}
        >
          <input
            className="form-input" placeholder="🔍  Search spaces..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          {cities.length > 1 && (
            <select className="form-input" value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '150px', colorScheme: 'dark' }}
            >
              {cities.map(c => <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>)}
            </select>
          )}
        </motion.div>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}
        {error && !loading && <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>⚠️ {error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '3rem' }}>🏛️</span>
            <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>No spaces found</p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {filtered.map((s, i) => <SpaceCard key={s.id} space={s} index={i} />)}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default Spaces
