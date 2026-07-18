import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function OrgProfile() {
  const { id } = useParams()
  const [org, setOrg]             = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [opps, setOpps]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  useEffect(() => {
    const load = async () => {
      try {
        const [orgRes, campRes, oppRes] = await Promise.all([
          api.get(`/organizations/${id}`),
          api.get('/campaigns', { params: { limit: 6 } }),
          api.get('/opportunities', { params: { limit: 6 } }),
        ])
        setOrg(orgRes.data)
        setCampaigns(campRes.data.filter(c => c.organization_id === id))
        setOpps(oppRes.data.filter(o => o.organization_id === id))

        // Follower count (public)
        api.get(`/organizations/${id}/followers/count`)
          .then(r => setFollowerCount(r.data.count || 0)).catch(() => {})

        // Follow status (logged-in only)
        if (isLoggedIn()) {
          api.get(`/organizations/${id}/follow/status`)
            .then(r => setFollowing(r.data.following || false)).catch(() => {})
        }
      } catch {
        setOrg(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isLoggedIn])

  const handleFollow = async () => {
    if (!isLoggedIn()) { toast.error('Log in to follow organizations'); return }
    setFollowLoading(true)
    try {
      if (following) {
        await api.delete(`/organizations/${id}/follow`)
        setFollowing(false)
        setFollowerCount(p => Math.max(0, p - 1))
        toast.success('Unfollowed')
      } else {
        await api.post(`/organizations/${id}/follow`)
        setFollowing(true)
        setFollowerCount(p => p + 1)
        toast.success('Following! 💜')
      }
    } catch { toast.error('Could not update follow') }
    finally { setFollowLoading(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (!org) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
        <p>Organization not found.</p>
        <Link to="/campaigns" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Browse Campaigns
        </Link>
      </div>
    </div>
  )

  const typeColors = {
    NONPROFIT: '#7c3aed', NGO: '#10b981', SOCIAL_ENTERPRISE: '#f59e0b', COMMUNITY_GROUP: '#3b82f6',
  }
  const typeColor = typeColors[org.org_type] || '#7c3aed'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>

        {/* Org header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(15,15,35,0.8)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px', padding: '2.5rem', marginBottom: '2rem',
            backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Accent top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: `linear-gradient(90deg, ${typeColor}, transparent)`,
          }} />

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: `${typeColor}20`, border: `2px solid ${typeColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', flexShrink: 0,
            }}>
              🏢
            </div>

            <div style={{ flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h1 style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 900,
                  fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', letterSpacing: '-0.02em',
                }}>
                  {org.name}
                </h1>
                {org.verification_status === 'VERIFIED' && (
                  <span style={{
                    padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem',
                    fontWeight: 700, background: `${typeColor}20`, color: typeColor,
                  }}>✓ Verified</span>
                )}
              </div>
              {/* Follow button + count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <button onClick={handleFollow} disabled={followLoading}
                  style={{
                    padding: '0.4rem 1.2rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: following ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.85)',
                    border: `1px solid ${following ? '#7c3aed' : 'transparent'}`,
                    color: following ? '#a78bfa' : 'white', opacity: followLoading ? 0.7 : 1,
                  }}>
                  {followLoading ? '...' : following ? '✓ Following' : '+ Follow'}
                </button>
                {followerCount > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    {followerCount.toLocaleString('en-IN')} follower{followerCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <span style={{
                padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem',
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                background: `${typeColor}15`, color: typeColor,
              }}>
                {org.org_type?.replace('_', ' ')}
              </span>

              {org.description && (
                <p style={{
                  color: 'var(--color-text-muted)', lineHeight: 1.7,
                  marginTop: '1rem', fontSize: '0.93rem',
                }}>
                  {org.description}
                </p>
              )}

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {org.city && (
                  <span style={{ color: 'var(--color-text-faint)', fontSize: '0.83rem' }}>
                    📍 {org.city}{org.country_code ? `, ${org.country_code}` : ''}
                  </span>
                )}
                {org.website_url && (
                  <a href={org.website_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#7c3aed', fontSize: '0.83rem', textDecoration: 'none' }}>
                    🌐 Website
                  </a>
                )}
                {org.contact_email && (
                  <a href={`mailto:${org.contact_email}`}
                    style={{ color: 'var(--color-text-faint)', fontSize: '0.83rem', textDecoration: 'none' }}>
                    ✉️ {org.contact_email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '1rem', marginTop: '1.75rem', paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            {[
              { label: 'Campaigns', value: campaigns.length, icon: '🎯' },
              { label: 'Opportunities', value: opps.length, icon: '🤝' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{stat.icon}</div>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', color: typeColor,
                }}>{stat.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Campaigns section */}
        {campaigns.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ marginBottom: '2rem' }}
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', marginBottom: '1.25rem' }}>
              🎯 Active Campaigns
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {campaigns.map(c => {
                const raised = c.total_raised ?? 0
                const goal   = c.goal_amount  ?? 1
                const pct    = Math.min(Math.round((raised / goal) * 100), 100)
                return (
                  <Link key={c.id} to={`/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '14px', padding: '1.25rem', backdropFilter: 'blur(20px)',
                      display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap',
                      transition: 'border-color 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                    >
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{c.title}</div>
                        <div style={{
                          background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '6px', overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: '99px',
                            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                          }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: '#a78bfa' }}>₹{raised.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>{pct}% funded</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Opportunities section */}
        {opps.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', marginBottom: '1.25rem' }}>
              🤝 Volunteer Opportunities
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {opps.map(o => (
                <Link key={o.id} to={`/volunteer/${o.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(15,15,35,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px', padding: '1.25rem', backdropFilter: 'blur(20px)',
                    display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap',
                    transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                  >
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{o.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)' }}>
                        {o.city && `📍 ${o.city}  `}
                        {o.location_type && `• ${o.location_type}`}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '99px', fontSize: '0.72rem',
                      fontWeight: 700, background: '#10b98115', color: '#34d399', flexShrink: 0,
                    }}>
                      {o.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {campaigns.length === 0 && opps.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌱</div>
            <p>This organization hasn't posted anything yet. Check back soon!</p>
          </div>
        )}
      </div>
      <Footer />
    </motion.div>
  )
}
