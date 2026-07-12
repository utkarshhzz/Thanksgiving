import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <Navbar />

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6rem 1.5rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>

          {/* Animated 404 */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={{
              fontSize: '8rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #7c3aed, #f59e0b, #10b981)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
              marginBottom: '0.5rem',
            }}
          >
            404
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🌌</div>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 800,
              fontSize: '1.75rem', letterSpacing: '-0.02em', marginBottom: '0.75rem',
            }}>
              Page not found
            </h1>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
              The page you're looking for has drifted into the void. Let's get you back to solid ground.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/" className="btn btn-primary">
                🏠 Go Home
              </Link>
              <Link to="/campaigns" className="btn btn-ghost">
                Browse Campaigns
              </Link>
            </div>
          </motion.div>

          {/* Floating particles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 2 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.4,
              }}
              style={{
                position: 'absolute',
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: ['#7c3aed', '#f59e0b', '#10b981', '#a78bfa', '#fbbf24'][i],
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 20}%`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
