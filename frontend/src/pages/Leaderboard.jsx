import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import api from '../api/client'

export default function Leaderboard() {
  const [tab, setTab]                 = useState('donors')
  const [donors, setDonors]           = useState([])
  const [volunteers, setVolunteers]   = useState([])
  const [loadingD, setLoadingD]       = useState(true)
  const [loadingV, setLoadingV]       = useState(true)

  useEffect(() => {
    api.get('/leaderboard/donors')
      .then(r => setDonors(r.data))
      .finally(() => setLoadingD(false))
    api.get('/leaderboard/volunteers')
      .then(r => setVolunteers(r.data))
      .finally(() => setLoadingV(false))
  }, [])

  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']
  const medals      = ['🥇', '🥈', '🥉']

  const RankCard = ({ entry, type, index }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        background:     'rgba(15,15,35,0.75)',
        border:         `1px solid ${index < 3 ? medalColors[index] + '30' : 'rgba(255,255,255,0.07)'}`,
        borderRadius:   '14px',
        padding:        '1.1rem 1.5rem',
        backdropFilter: 'blur(20px)',
        display:        'flex',
        alignItems:     'center',
        gap:            '1rem',
      }}
    >
      {/* Rank */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: index < 3 ? `${medalColors[index]}15` : 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: index < 3 ? '1.3rem' : '0.85rem',
        fontWeight: 700, color: index < 3 ? medalColors[index] : 'var(--color-text-muted)',
      }}>
        {index < 3 ? medals[index] : entry.rank}
      </div>

      {/* Avatar placeholder */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
        background: `hsl(${(entry.rank * 47) % 360}, 60%, 40%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 700, color: 'white',
      }}>
        {entry.display_name.charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <div style={{ flexGrow: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{entry.display_name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
          {type === 'donors'
            ? `${entry.donation_count} donation${entry.donation_count !== 1 ? 's' : ''}`
            : `${entry.log_count} log${entry.log_count !== 1 ? 's' : ''}`
          }
        </div>
      </div>

      {/* Value */}
      <div style={{
        fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem',
        color: type === 'donors' ? '#a78bfa' : '#34d399', flexShrink: 0,
      }}>
        {type === 'donors'
          ? `₹${entry.total_donated.toLocaleString('en-IN')}`
          : `${entry.total_hours.toFixed(1)}h`
        }
      </div>
    </motion.div>
  )

  const isLoading = tab === 'donors' ? loadingD : loadingV
  const data      = tab === 'donors' ? donors : volunteers

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Navbar />
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏆</div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 900,
            fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em',
          }}>
            Community <span className="text-gradient">Leaderboard</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Celebrating the most impactful members of our community.
          </p>
        </motion.div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
          padding: '4px', marginBottom: '2rem', gap: '4px',
        }}>
          {[
            { key: 'donors', label: '💜 Top Donors' },
            { key: 'volunteers', label: '🤝 Top Volunteers' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                background: tab === t.key ? 'var(--color-primary)' : 'transparent',
                color: tab === t.key ? 'white' : 'var(--color-text-muted)',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              {tab === 'donors' ? '💜' : '🤝'}
            </div>
            <p>No entries yet — be the first!</p>
            <Link to={tab === 'donors' ? '/campaigns' : '/volunteer'}
              className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
              {tab === 'donors' ? 'Browse Campaigns →' : 'Find Opportunities →'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.map((entry, i) => (
              <RankCard key={entry.user_id} entry={entry} type={tab} index={i} />
            ))}
          </div>
        )}

        {/* CTA */}
        {!isLoading && data.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{
              textAlign: 'center', marginTop: '2.5rem', padding: '1.75rem',
              background: 'rgba(124,58,237,0.08)', border: '1px dashed rgba(124,58,237,0.3)',
              borderRadius: '16px',
            }}
          >
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              {tab === 'donors' ? '💜 Want to see your name here? Support a campaign!' : '🤝 Start volunteering and climb the board!'}
            </p>
            <Link to={tab === 'donors' ? '/campaigns' : '/volunteer'}
              className="btn btn-primary">
              {tab === 'donors' ? 'Donate Now' : 'Volunteer Now'}
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
