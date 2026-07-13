// src/components/NotificationsBell.jsx
// Bell icon in the Navbar with unread badge + dropdown panel
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'

export default function NotificationsBell() {
  const [open, setOpen]               = useState(false)
  const [unread, setUnread]           = useState(0)
  const [notifications, setNotifs]    = useState([])
  const [loading, setLoading]         = useState(false)
  const ref = useRef(null)

  // Poll unread count every 60 seconds
  useEffect(() => {
    const fetch = () => api.get('/users/me/notifications/unread-count')
      .then(r => setUnread(r.data.unread || 0))
      .catch(() => {})
    fetch()
    const id = setInterval(fetch, 60000)
    return () => clearInterval(id)
  }, [])

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get('/users/me/notifications?limit=15')
      .then(r => setNotifs(r.data))
      .finally(() => setLoading(false))
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {})
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        id="notifications-bell"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        style={{
          position: 'relative', background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '6px', borderRadius: '8px',
          color: open ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
          fontSize: '1.2rem', lineHeight: 1, transition: 'color 0.2s',
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: '#ef4444', color: 'white', borderRadius: '99px',
            fontSize: '0.6rem', fontWeight: 800, minWidth: '16px', height: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: '340px', maxHeight: '420px', overflowY: 'auto',
              background: 'rgba(10,10,28,0.98)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px', backdropFilter: 'blur(24px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 2000,
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.25rem 0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                  Mark all read
                </button>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                <p style={{ fontSize: '0.85rem' }}>You're all caught up!</p>
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <div key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    style={{
                      padding: '0.85rem 1.25rem',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: n.is_read ? 'transparent' : 'rgba(124,58,237,0.06)',
                      cursor: n.is_read ? 'default' : 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{n.icon || '🔔'}</span>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: n.is_read ? 500 : 700, fontSize: '0.85rem',
                        marginBottom: '0.2rem', color: n.is_read ? 'var(--color-text-muted)' : 'var(--color-text)',
                      }}>
                        {n.link ? (
                          <Link to={n.link} onClick={() => setOpen(false)}
                            style={{ color: 'inherit', textDecoration: 'none' }}>
                            {n.title}
                          </Link>
                        ) : n.title}
                      </div>
                      {n.body && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', lineHeight: 1.4 }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-faint)', marginTop: '0.3rem' }}>
                        {new Date(n.created_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#7c3aed', flexShrink: 0, marginTop: '4px',
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
