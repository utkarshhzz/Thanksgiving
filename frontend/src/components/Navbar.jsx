import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const navLinks = [
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/volunteer',  label: 'Volunteer'  },
  { to: '/in-kind',    label: 'Donate Goods' },
  { to: '/spaces',     label: 'Spaces'     },
]

function Navbar() {
  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const user      = useAuthStore(s => s.user)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const logout    = useAuthStore(s => s.logout)
  const navigate  = useNavigate()
  const location  = useLocation()

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out. See you soon! 👋')
    navigate('/')
  }

  return (
    <motion.nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '0 1.5rem', transition: 'all 0.3s ease',
        background:     scrolled ? 'rgba(5, 8, 22, 0.9)'  : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)'            : 'none',
        borderBottom:   scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.6rem' }}>🤝</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Thank<span className="text-gradient">Giving</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <ul style={{ display: 'flex', listStyle: 'none', gap: '2rem', margin: 0, padding: 0 }}
            className="desktop-nav">
          {navLinks.map(link => (
            <li key={link.to}>
              <Link to={link.to} style={{
                color:          location.pathname.startsWith(link.to) ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                fontWeight:     500, fontSize: '0.9rem',
                transition:     'color 0.2s', textDecoration: 'none',
                borderBottom:   location.pathname.startsWith(link.to) ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                paddingBottom:  '4px',
              }}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop Auth Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }} className="desktop-nav">
          {isLoggedIn() ? (
            <>
              <Link to="/profile" style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: 'var(--color-text-muted)', fontSize: '0.85rem', textDecoration: 'none',
                padding: '0.3rem 0.75rem', borderRadius: '99px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.2s',
              }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>
                  {(user?.first_name || '?')[0].toUpperCase()}
                </span>
                {user?.first_name}
              </Link>
              <Link to="/dashboard" className="btn btn-outline btn-sm">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started →</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileOpen(v => !v)}
          style={{
            display: 'none', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text)', padding: '0.5rem', borderRadius: '8px',
          }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(5,8,22,0.97)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} style={{
                  display: 'block', padding: '0.75rem 1rem', borderRadius: '10px',
                  textDecoration: 'none', fontWeight: 500, fontSize: '1rem',
                  color: location.pathname.startsWith(link.to) ? '#a78bfa' : 'var(--color-text-muted)',
                  background: location.pathname.startsWith(link.to) ? 'rgba(124,58,237,0.1)' : 'transparent',
                }}>
                  {link.label}
                </Link>
              ))}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0.5rem 0' }} />
              {isLoggedIn() ? (
                <>
                  <Link to="/dashboard" style={{ display: 'block', padding: '0.75rem 1rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                    📊 Dashboard
                  </Link>
                  <Link to="/profile" style={{ display: 'block', padding: '0.75rem 1rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                    👤 Profile
                  </Link>
                  <button onClick={handleLogout} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '10px', background: 'none', border: 'none', fontWeight: 500, color: '#f87171', cursor: 'pointer', fontSize: '1rem' }}>
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"    className="btn btn-ghost" style={{ width: '100%', textAlign: 'center' }}>Login</Link>
                  <Link to="/register" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>Get Started →</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

export default Navbar
