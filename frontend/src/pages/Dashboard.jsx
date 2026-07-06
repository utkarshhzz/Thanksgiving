import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import { useAuthStore } from '../store/authStore'
import { campaignApi } from '../api/campaigns'
import { volunteerApi } from '../api/volunteering'
import { inKindApi } from '../api/inkind'
import { spacesApi } from '../api/spaces'

// ── Small stat card at the top of the dashboard ─────────────────
function StatCard({ icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        background:   'rgba(15, 15, 35, 0.7)',
        border:       `1px solid ${color}33`,
        borderRadius: '16px',
        padding:      '1.5rem',
        backdropFilter: 'blur(20px)',
        display:      'flex',
        alignItems:   'center',
        gap:          '1rem',
      }}
    >
      <div style={{
        width:        '52px',
        height:       '52px',
        borderRadius: '12px',
        background:   `${color}20`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     '1.5rem',
        flexShrink:   0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
          {label}
        </div>
        <div style={{
          fontSize:   '1.8rem',
          fontWeight: 800,
          fontFamily: 'var(--font-heading)',
          color:      color,
        }}>
          {value ?? <span style={{ fontSize: '1rem', opacity: 0.5 }}>—</span>}
        </div>
      </div>
    </motion.div>
  )
}

// ── Module action card ───────────────────────────────────────────
function ModuleCard({ icon, title, description, to, color, actions, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      style={{
        background:   'rgba(15, 15, 35, 0.6)',
        border:       '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        padding:      '1.75rem',
        backdropFilter: 'blur(20px)',
        transition:   'border-color 0.2s',
        position:     'relative',
        overflow:     'hidden',
      }}
      onHoverStart={e => {}}
    >
      {/* Colored top-edge accent */}
      <div style={{
        position:   'absolute',
        top:        0, left: 0, right: 0,
        height:     '3px',
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          fontSize:     '2rem',
          width:        '52px',
          height:       '52px',
          borderRadius: '12px',
          background:   `${color}15`,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          flexShrink:   0,
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{
            fontFamily:  'var(--font-heading)',
            fontWeight:  700,
            fontSize:    '1.1rem',
            marginBottom: '0.3rem',
          }}>
            {title}
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {actions.map(action => (
          <Link
            key={action.label}
            to={action.to}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '0.3rem',
              padding:      '0.4rem 0.9rem',
              borderRadius: '20px',
              fontSize:     '0.8rem',
              fontWeight:   600,
              background:   action.primary ? `${color}20` : 'rgba(255,255,255,0.05)',
              color:        action.primary ? color : 'var(--color-text-muted)',
              border:       `1px solid ${action.primary ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
              textDecoration: 'none',
              transition:   'all 0.2s',
            }}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────
function Dashboard() {
  const user = useAuthStore(s => s.user)
  const isOrgUser = useAuthStore(s => s.isOrgUser)

  // State for each module's quick stats
  const [stats, setStats] = useState({
    campaigns:   null,
    hours:       null,
    donations:   null,
    spaces:      null,
  })

  // Load stats on mount — fire all 4 requests in parallel with Promise.all
  useEffect(() => {
    const load = async () => {
      try {
        // Promise.allSettled: runs all promises, doesn't fail if one fails.
        // Each result is { status: 'fulfilled'|'rejected', value|reason }
        const [campaigns, hours, donations, spaces] = await Promise.allSettled([
          campaignApi.list(),
          volunteerApi.myHours(),
          inKindApi.myOffers(),
          spacesApi.myBookings(),
        ])

        setStats({
          campaigns: campaigns.status === 'fulfilled'
            ? campaigns.value.data?.length ?? 0
            : '—',
          hours: hours.status === 'fulfilled'
            ? hours.value.data?.length ?? 0
            : '—',
          donations: donations.status === 'fulfilled'
            ? donations.value.data?.length ?? 0
            : '—',
          spaces: spaces.status === 'fulfilled'
            ? spaces.value.data?.length ?? 0
            : '—',
        })
      } catch {
        // silently ignore — stats just show dashes
      }
    }
    load()
  }, [])

  const modules = [
    {
      icon:  '💰',
      title: 'Crowdfunding',
      color: '#7c3aed',
      description: 'Fund campaigns, track donations, and support the causes you care about.',
      delay: 0.3,
      actions: [
        { label: 'Browse Campaigns', to: '/campaigns', primary: false },
        ...(isOrgUser() ? [{ label: '+ Create Campaign', to: '/campaigns/new', primary: true }] : []),
        { label: 'My Donations', to: '/campaigns/donations', primary: false },
      ],
    },
    {
      icon:  '🙋',
      title: 'Volunteering',
      color: '#10b981',
      description: 'Discover opportunities, apply, log hours with QR check-in, and build your impact portfolio.',
      delay: 0.4,
      actions: [
        { label: 'Find Opportunities', to: '/volunteer', primary: false },
        { label: 'My Applications', to: '/volunteer/applications', primary: true },
        { label: 'Log Hours', to: '/volunteer/log-hours', primary: false },
      ],
    },
    {
      icon:  '📦',
      title: 'In-Kind Donations',
      color: '#f59e0b',
      description: 'Offer goods directly to nonprofits — food, clothing, equipment. Tracked from offer to pickup.',
      delay: 0.5,
      actions: [
        { label: 'Make an Offer', to: '/in-kind/new', primary: true },
        { label: 'My Offers', to: '/in-kind', primary: false },
      ],
    },
    {
      icon:  '🏛️',
      title: 'Space Sharing',
      color: '#a78bfa',
      description: 'Book spaces for events or list your venue for nonprofits. Manage availability and bookings.',
      delay: 0.6,
      actions: [
        { label: 'Browse Spaces', to: '/spaces', primary: false },
        { label: 'My Bookings', to: '/spaces/bookings', primary: true },
        ...(isOrgUser() ? [{ label: 'List a Space', to: '/spaces/new', primary: false }] : []),
      ],
    },
  ]

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ minHeight: '100vh', paddingBottom: '4rem' }}
    >
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem 2rem' }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2.5rem' }}
        >
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
            {greeting} 👋
          </p>
          <h1 style={{
            fontFamily:   'var(--font-heading)',
            fontWeight:   900,
            fontSize:     'clamp(1.8rem, 4vw, 2.8rem)',
            letterSpacing: '-0.02em',
          }}>
            {user?.first_name ? (
              <>{user.first_name} {user.last_name}, <span className="text-gradient">your impact dashboard</span></>
            ) : (
              <>Your <span className="text-gradient">Impact Dashboard</span></>
            )}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
            {isOrgUser()
              ? 'Manage your organization\'s campaigns, volunteers, and resources.'
              : 'Track your donations, volunteer hours, and bookings all in one place.'
            }
          </p>
        </motion.div>

        {/* ── Stats row ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap:                 '1rem',
          marginBottom:        '2.5rem',
        }}>
          <StatCard icon="💰" label="Active Campaigns"   value={stats.campaigns} color="#7c3aed" delay={0.1} />
          <StatCard icon="⏱️" label="Hours Logged"       value={stats.hours}     color="#10b981" delay={0.15} />
          <StatCard icon="📦" label="Goods Offered"      value={stats.donations} color="#f59e0b" delay={0.2} />
          <StatCard icon="📅" label="Space Bookings"     value={stats.spaces}    color="#a78bfa" delay={0.25} />
        </div>

        {/* ── Module cards ── */}
        <h2 style={{
          fontFamily:   'var(--font-heading)',
          fontWeight:   700,
          fontSize:     '1.1rem',
          color:        'var(--color-text-muted)',
          marginBottom: '1rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontSize:     '0.8rem',
        }}>
          Explore Modules
        </h2>

        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap:                 '1.25rem',
        }}>
          {modules.map(mod => <ModuleCard key={mod.title} {...mod} />)}
        </div>

        {/* ── Quick tip for new users ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop:    '2rem',
            padding:      '1.25rem 1.5rem',
            background:   'rgba(124, 58, 237, 0.08)',
            border:       '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '14px',
            display:      'flex',
            alignItems:   'center',
            gap:          '1rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>💡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              {isOrgUser()
                ? 'Tip: Create your first campaign to start receiving donations'
                : 'Tip: Browse campaigns and make your first donation in under 2 minutes'
              }
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Your contributions are tracked, verified, and receipts are available for download.
            </div>
          </div>
          <Link
            to={isOrgUser() ? '/campaigns/new' : '/campaigns'}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}
          >
            {isOrgUser() ? 'Create →' : 'Browse →'}
          </Link>
        </motion.div>

      </div>
    </motion.div>
  )
}

export default Dashboard
