import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import { campaignApi } from '../api/campaigns'
import { useAuthStore } from '../store/authStore'

// ── Progress bar component ───────────────────────────────────────
function ProgressBar({ raised, goal, color = '#7c3aed' }) {
  const pct = Math.min((raised / goal) * 100, 100)
  return (
    <div style={{
      background:   'rgba(255,255,255,0.08)',
      borderRadius: '99px',
      height:       '6px',
      overflow:     'hidden',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        style={{
          height:     '100%',
          borderRadius: '99px',
          background: `linear-gradient(90deg, ${color}, #a78bfa)`,
        }}
      />
    </div>
  )
}

// ── Single campaign card ─────────────────────────────────────────
function CampaignCard({ campaign, index }) {
  const raised   = campaign.total_raised ?? 0
  const goal     = campaign.goal_amount  ?? 1
  const pct      = Math.min(Math.round((raised / goal) * 100), 100)
  const daysLeft = campaign.end_date
    ? Math.max(0, Math.ceil((new Date(campaign.end_date) - Date.now()) / 86400000))
    : null

  const statusColor = {
    active:    '#10b981',
    draft:     '#94a3b8',
    completed: '#7c3aed',
    cancelled: '#ef4444',
  }[campaign.status] ?? '#94a3b8'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
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
      {/* Card top-color stripe */}
      <div style={{
        height:     '4px',
        background: `linear-gradient(90deg, ${statusColor}, transparent)`,
      }} />

      <div style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Status + type badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            padding:      '2px 10px',
            borderRadius: '99px',
            fontSize:     '0.7rem',
            fontWeight:   700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background:   `${statusColor}20`,
            color:        statusColor,
          }}>
            {campaign.status}
          </span>
          {campaign.campaign_type && (
            <span style={{
              padding:      '2px 10px',
              borderRadius: '99px',
              fontSize:     '0.7rem',
              fontWeight:   600,
              background:   'rgba(255,255,255,0.06)',
              color:        'var(--color-text-muted)',
            }}>
              {campaign.campaign_type.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily:  'var(--font-heading)',
          fontWeight:  700,
          fontSize:    '1.05rem',
          lineHeight:  1.3,
          color:       'var(--color-text)',
        }}>
          {campaign.title}
        </h3>

        {/* Description preview */}
        {campaign.description && (
          <p style={{
            color:     'var(--color-text-muted)',
            fontSize:  '0.83rem',
            lineHeight: 1.6,
            // CSS to clamp to 2 lines
            display:            '-webkit-box',
            WebkitLineClamp:    2,
            WebkitBoxOrient:    'vertical',
            overflow:           'hidden',
            flexGrow:           1,
          }}>
            {campaign.description}
          </p>
        )}

        {/* Progress */}
        <div>
          <ProgressBar raised={raised} goal={goal} />
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            marginTop:      '0.5rem',
            fontSize:       '0.8rem',
          }}>
            <span style={{ color: 'var(--color-text)' }}>
              <strong style={{ color: '#a78bfa' }}>
                ₹{raised.toLocaleString('en-IN')}
              </strong>{' '}raised
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {pct}% of ₹{goal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Footer: days left + button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days left` : 'Ended') : ''}
          </span>
          <Link
            to={`/campaigns/${campaign.id}`}
            style={{
              padding:      '0.4rem 1rem',
              borderRadius: '99px',
              fontSize:     '0.8rem',
              fontWeight:   600,
              background:   'rgba(124, 58, 237, 0.2)',
              color:        'var(--color-primary-light)',
              border:       '1px solid rgba(124, 58, 237, 0.3)',
              textDecoration: 'none',
              transition:   'all 0.2s',
            }}
          >
            View →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ── Campaigns list page ──────────────────────────────────────────
function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const isOrgUser = useAuthStore(s => s.isOrgUser)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await campaignApi.list()
        setCampaigns(res.data)
      } catch {
        setError('Could not load campaigns. Is the backend running?')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Client-side filtering — no extra API calls needed
  const filtered = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchesType   = typeFilter === 'all' || c.campaign_type === typeFilter
    return matchesSearch && matchesType
  })

  const campaignTypes = ['all', ...new Set(campaigns.map(c => c.campaign_type).filter(Boolean))]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontFamily:   'var(--font-heading)',
                fontWeight:   900,
                fontSize:     'clamp(2rem, 4vw, 3rem)',
                letterSpacing: '-0.03em',
              }}>
                Active <span className="text-gradient">Campaigns</span>
              </h1>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Support causes that matter — every rupee is tracked.
              </p>
            </div>

            {/* Create button — only for org users */}
            {isOrgUser() && (
              <Link to="/campaigns/new" className="btn btn-primary">
                + New Campaign
              </Link>
            )}
          </div>
        </motion.div>

        {/* Search + filter bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}
        >
          <input
            className="form-input"
            placeholder="🔍  Search campaigns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {campaignTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                style={{
                  padding:      '0.5rem 1rem',
                  borderRadius: '99px',
                  fontSize:     '0.8rem',
                  fontWeight:   600,
                  border:       '1px solid',
                  cursor:       'pointer',
                  transition:   'all 0.2s',
                  background:   typeFilter === type ? 'var(--color-primary)' : 'transparent',
                  borderColor:  typeFilter === type ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)',
                  color:        typeFilter === type ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {type === 'all' ? 'All' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px' }} />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{
            textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)',
          }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <p style={{ marginTop: '1rem' }}>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '3rem' }}>📭</span>
            <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>No campaigns found</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {search ? 'Try a different search term' : 'Be the first to create one!'}
            </p>
          </div>
        )}

        {/* Campaign grid */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap:                 '1.5rem',
          }}>
            {filtered.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default Campaigns
