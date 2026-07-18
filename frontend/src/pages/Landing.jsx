import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import HeroCanvas from '../components/HeroCanvas.jsx'
import Footer from '../components/Footer.jsx'
import api from '../api/client'

// ── Reusable: animated counter (e.g., "0" → "10,000") ──────────
// This is a child component defined in the same file.
// Small, single-purpose components like this don't need their own files.
function AnimatedStat({ value, label, prefix = '', suffix = '' }) {
  return (
    // whileInView: animation plays when element enters the viewport
    // viewport={{ once: true }}: only plays once — not every time you scroll past
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      style={{ textAlign: 'center' }}
    >
      <div style={{
        fontSize: 'clamp(2rem, 4vw, 3.5rem)',  // clamp = min, preferred, max
        fontWeight: 900,
        fontFamily: 'var(--font-heading)',
        background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {prefix}{value}{suffix}
      </div>
      <div style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
        {label}
      </div>
    </motion.div>
  )
}

// ── One feature module card ──────────────────────────────────────
function FeatureCard({ icon, title, description, index }) {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}  // stagger: each card is 0.1s later
      whileHover={{ scale: 1.02 }}   // gentle scale on hover
      style={{ cursor: 'default' }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{
        fontSize: '1.2rem',
        marginBottom: '0.75rem',
        fontFamily: 'var(--font-heading)',
      }}>
        {title}
      </h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        {description}
      </p>
    </motion.div>
  )
}

// ── The main Landing page component ─────────────────────────────
function Landing() {
  // Live stats fetched from the public /stats endpoint
  const [liveStats, setLiveStats] = useState(null)

  useEffect(() => {
    api.get('/stats')
      .then(res => setLiveStats(res.data))
      .catch(() => {}) // graceful fail — fallback shown below
  }, [])

  const features = [
    {
      icon: '💰',
      title: 'Crowdfunding',
      description: 'Launch campaigns for social causes. Transparent fund tracking, donor receipts, and real-time impact reporting for every rupee raised.',
    },
    {
      icon: '🙋',
      title: 'Volunteering',
      description: 'Discover volunteer opportunities near you. Apply, log hours with QR check-in, and build a verified impact portfolio.',
    },
    {
      icon: '📦',
      title: 'In-Kind Donations',
      description: 'Offer physical goods — food, clothing, medical supplies — directly to verified nonprofits. Tracked from offer to distribution.',
    },
    {
      icon: '🏛️',
      title: 'Space Sharing',
      description: 'List your hall, office, or warehouse for nonprofits. Manage bookings, set availability, and maximize your space\'s social impact.',
    },
  ]

  return (
    // motion.div with page-level animation
    // This wraps the entire page and fades it in when navigated to
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Navbar />

      {/* ════════════════════════════════════════════════
          HERO SECTION — full viewport height, 3D canvas behind text
          position:relative on the container lets us layer:
          - Three.js canvas (absolute, fills everything)
          - Text content (absolute, centered on top)
      ════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        height: '100vh',
        minHeight: '700px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Three.js canvas fills the entire hero section */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <HeroCanvas />
        </div>

        {/* Gradient fade at the bottom — blends hero into next section */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: 'linear-gradient(transparent, var(--color-bg))',
          pointerEvents: 'none',  // don't block mouse events
        }} />

        {/* Text content — sits on top of the 3D canvas */}
        <div style={{
          position: 'relative',  // above the canvas (z-index stacking)
          zIndex: 10,
          textAlign: 'center',
          padding: '0 1.5rem',
          maxWidth: '800px',
        }}>
          {/* Badge pill above the headline */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="badge badge-primary" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
              🇮🇳 Building Social Good, Together
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              letterSpacing: '-0.03em',
            }}
          >
            Connect.{' '}
            <span className="text-gradient">Give.</span>
            {' '}Impact.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              marginBottom: '2.5rem',
              lineHeight: 1.7,
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
            }}
          >
            India's first unified platform for crowdfunding, volunteering,
            in-kind donations, and space sharing — connecting nonprofits
            with the people who want to help.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link to="/register" className="btn btn-primary btn-lg">
              Start Giving →
            </Link>
            <Link to="/campaigns" className="btn btn-outline btn-lg">
              Browse Campaigns
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'var(--color-text-faint)',
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          animate={{ y: [0, 8, 0] }}           // bounces up and down
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <span>Scroll to explore</span>
          <span style={{ fontSize: '1.2rem' }}>↓</span>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════
          STATS SECTION
      ════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--color-bg-card)' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '3rem',
        }}>
          <AnimatedStat
            value={liveStats ? `${(liveStats.total_donors_and_volunteers || 0).toLocaleString('en-IN')}+` : '...'}
            label="Donors & Volunteers"
          />
          <AnimatedStat
            value={liveStats
              ? liveStats.total_raised_inr >= 10000000
                ? `₹${(liveStats.total_raised_inr / 10000000).toFixed(1)}Cr+`
                : liveStats.total_raised_inr >= 100000
                  ? `₹${(liveStats.total_raised_inr / 100000).toFixed(1)}L+`
                  : `₹${Math.round(liveStats.total_raised_inr).toLocaleString('en-IN')}`
              : '...'}
            label="Funds Raised"
          />
          <AnimatedStat
            value={liveStats ? `${(liveStats.total_campaigns || 0).toLocaleString('en-IN')}+` : '...'}
            label="Campaigns Launched"
          />
          <AnimatedStat
            value={liveStats ? `${Math.round(liveStats.total_volunteer_hours || 0).toLocaleString('en-IN')}+` : '...'}
            label="Volunteer Hours Logged"
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FEATURES SECTION
      ════════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              marginBottom: '1rem',
            }}>
              Four Ways to <span className="text-gradient">Make an Impact</span>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
              One platform. Every kind of giving. Every kind of organization.
            </p>
          </motion.div>

          {/* Feature cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
          }}>
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TRENDING CAMPAIGNS SECTION
      ════════════════════════════════════════════════ */}
      <TrendingSection />

      {/* ════════════════════════════════════════════════
          FINAL CTA SECTION
      ════════════════════════════════════════════════ */}
      <section style={{
        padding: '6rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(245, 158, 11, 0.05))',
        borderTop: '1px solid var(--color-border)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}
        >
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            marginBottom: '1rem',
          }}>
            Ready to create impact?
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '1rem' }}>
            Join thousands of donors, volunteers, and nonprofits already using ThankGiving.
          </p>
          <Link to="/register" className="btn btn-accent btn-lg">
            Create Free Account →
          </Link>
        </motion.div>
      </section>

      <Footer />
    </motion.div>
  )
}

// ── Trending Campaigns Section ──────────────────────────────────────
function TrendingSection() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.get('/campaigns/trending?limit=6').then(res => {
      setCampaigns(res.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading || campaigns.length === 0) return null

  return (
    <section style={{ padding: '6rem 1.5rem', background: 'rgba(124,58,237,0.03)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '99px', padding: '0.3rem 1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase' }}>🔥 Trending Now</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.75rem' }}>
            Campaigns Gaining <span className="text-gradient">Momentum</span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto' }}>
            These campaigns are raising the most right now. Be part of the movement.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.5rem' }}>
          {campaigns.map((c, i) => {
            const pct = Math.min(Math.round((parseFloat(c.raised_amount || 0) / parseFloat(c.target_amount || 1)) * 100), 100)
            const daysLeft = c.end_date ? Math.max(0, Math.ceil((new Date(c.end_date) - Date.now()) / 86400000)) : null
            return (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                style={{ background: 'rgba(15,15,35,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(20px)' }}
              >
                {c.image_url
                  ? <img src={c.image_url} alt={c.title} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                  : <div style={{ height: '150px', background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(245,158,11,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>💜</div>
                }
                <div style={{ padding: '1.25rem' }}>
                  {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: '99px', marginBottom: '0.6rem', display: 'inline-block' }}>🔥 {daysLeft}d left</span>
                  )}
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.3, marginBottom: '0.75rem' }}>
                    {c.title}
                  </h3>
                  {/* Progress bar */}
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '5px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.07 + 0.3 }}
                      style={{ height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: '99px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    <span><strong style={{ color: '#a78bfa' }}>₹{parseFloat(c.raised_amount || 0).toLocaleString('en-IN')}</strong> raised</span>
                    <span>{pct}%</span>
                  </div>
                  <Link to={`/campaigns/${c.id}`} style={{ display: 'block', textAlign: 'center', padding: '0.55rem', borderRadius: '10px', background: 'rgba(124,58,237,0.18)', color: '#a78bfa', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', border: '1px solid rgba(124,58,237,0.25)' }}>
                    Donate Now →
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link to="/campaigns" className="btn btn-outline">View All Campaigns →</Link>
        </div>
      </div>
    </section>
  )
}

export default Landing
