// useState: tracks local state (is mobile menu open? has user scrolled?)
// useEffect: runs code after render — like __init__ side effects
import { useState, useEffect } from 'react'

// Link: like <a> but doesn't reload the page (React Router)
// useNavigate: programmatically go to a URL (after logout, after login, etc.)
// useLocation: tells you the current URL (to highlight active nav link)
import { Link, useNavigate, useLocation } from 'react-router-dom'

// motion: makes any HTML element animatable
// AnimatePresence: needed to animate elements LEAVING the screen
import { motion, AnimatePresence } from 'framer-motion'

import { useAuthStore } from '../store/authStore'

function Navbar() {
  // false = navbar is transparent (top of page)
  // true = navbar has glass background (user scrolled down)
  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Reading from the global store. Destructure exactly what we need.
  const user      = useAuthStore(s => s.user)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const logout    = useAuthStore(s => s.logout)

  const navigate = useNavigate()
  const location = useLocation()  // { pathname: '/login', ... }

  // useEffect(fn, []) = run once after the component mounts.
  // It's equivalent to "on startup". The [] = no dependencies.
  // We listen for scroll events to toggle the glassmorphism style.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)

    // The RETURN from useEffect is the "cleanup" function.
    // React calls it when the component unmounts (leaves the screen).
    // Without this, we'd leak event listeners — a memory leak.
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()        // clears the Zustand store + localStorage
    navigate('/')   // send user back to landing page
  }

  const navLinks = [
    { to: '/campaigns', label: 'Campaigns' },
    { to: '/volunteer',  label: 'Volunteer'  },
    { to: '/in-kind',    label: 'Donate Goods' },
    { to: '/spaces',     label: 'Spaces'     },
  ]

  return (
    // motion.nav = a <nav> element with animation capabilities.
    // initial: state before animation starts (off-screen above)
    // animate: target state (visible at top)
    // transition: how the animation behaves
    <motion.nav
      style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        zIndex:         1000,
        padding:        '0 1.5rem',
        transition:     'all 0.3s ease',
        background:     scrolled ? 'rgba(5, 8, 22, 0.85)'   : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)'              : 'none',
        borderBottom:   scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div style={{
        maxWidth:       '1200px',
        margin:         '0 auto',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        height:         '72px',
      }}>

        {/* ── Logo ── */}
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
          <span style={{ fontSize: '1.6rem' }}>🤝</span>
          <span style={{
            fontFamily:  'var(--font-heading)',
            fontWeight:  800,
            fontSize:    '1.3rem',
            color:       'var(--color-text)',
            letterSpacing: '-0.02em',
          }}>
            Thank<span className="text-gradient">Giving</span>
          </span>
        </Link>

        {/* ── Desktop Nav Links ── */}
        {/* These hide on mobile via the @media query in index.css */}
        <ul style={{
          display:    'flex',
          listStyle:  'none',
          gap:        '2rem',
          margin:     0,
          padding:    0,
        }}>
          {/* .map() loops over the array and returns a JSX element for each item.
              Think of it like a Python list comprehension: [jsx for link in navLinks] */}
          {navLinks.map(link => (
            // key= is required when rendering lists — React uses it to track
            // which item is which during re-renders (like a database primary key).
            <li key={link.to}>
              <Link
                to={link.to}
                style={{
                  color:          location.pathname === link.to
                                    ? 'var(--color-primary-light)'
                                    : 'var(--color-text-muted)',
                  fontWeight:     500,
                  fontSize:       '0.9rem',
                  transition:     'color 0.2s',
                  textDecoration: 'none',
                  // Underline indicator for active page
                  borderBottom:   location.pathname === link.to
                                    ? '2px solid var(--color-primary-light)'
                                    : '2px solid transparent',
                  paddingBottom:  '4px',
                }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Auth Buttons ── */}
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          {/* Conditional rendering: if logged in → show Dashboard/Logout.
              In JavaScript, {condition && <JSX>} renders JSX only if condition is true.
              This is like Python's `if condition: render_thing()` */}
          {isLoggedIn() ? (
            <>
              <span style={{ color:'var(--color-text-muted)', fontSize:'0.85rem' }}>
                Hi, {user?.first_name}
              </span>
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
      </div>
    </motion.nav>
  )
}

export default Navbar
