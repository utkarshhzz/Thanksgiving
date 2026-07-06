// useEffect for GSAP scroll animations
// useRef to reference DOM elements
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// motion.div: an animatable <div>
// useInView: returns true when element enters the viewport (scroll-triggered)
import { motion, useInView } from 'framer-motion'

import Navbar from '../components/Navbar.jsx'
import HeroCanvas from '../components/HeroCanvas.jsx'

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
          <AnimatedStat value="10,000+" label="Donors & Volunteers" />
          <AnimatedStat value="₹2.5Cr+" label="Funds Raised" />
          <AnimatedStat value="500+" label="Nonprofits Supported" />
          <AnimatedStat value="50,000+" label="Volunteer Hours Logged" />
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

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        color: 'var(--color-text-faint)',
        fontSize: '0.85rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p>© 2026 ThankGiving · Built with ❤️ for social good · India</p>
        </div>
      </footer>
    </motion.div>
  )
}

export default Landing
