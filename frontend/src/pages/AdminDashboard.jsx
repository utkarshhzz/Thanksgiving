import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar.jsx'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

// ── Animated stat card ───────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#7c3aed', delay = 0 }) {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color }}>{value}</div>
      {sub && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{sub}</div>}
    </motion.div>
  )
}

// ── Section header ───────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', margin: '2rem 0 1rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </h2>
  )
}

// ── Data table ───────────────────────────────────────────────────────────────
function DataTable({ columns, rows, emptyMsg = 'No data.' }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            {columns.map(col => (
              <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>{emptyMsg}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '0.75rem 1rem', color: 'var(--color-text)', verticalAlign: 'middle' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Status badge ─────────────────────────────────────────────────────────────
function Badge({ text, color = '#7c3aed' }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: `${color}22`, color, textTransform: 'uppercase' }}>{text}</span>
  )
}

const fmt = (n) => Number(n).toLocaleString('en-IN')
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const user = useAuthStore(s => s.user)
  const [stats, setStats]           = useState(null)
  const [users, setUsers]           = useState([])
  const [campaigns, setCampaigns]   = useState([])
  const [donations, setDonations]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('overview')

  // Only ADMIN can access this page
  if (user && user.user_type !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, usersRes, campaignsRes, donationsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users?limit=50'),
          api.get('/admin/campaigns?limit=50'),
          api.get('/admin/donations/recent?limit=20'),
        ])
        setStats(statsRes.data)
        setUsers(usersRes.data)
        setCampaigns(campaignsRes.data)
        setDonations(donationsRes.data)
      } catch (err) {
        toast.error('Failed to load admin data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDeactivate = async (userId, email) => {
    try {
      await api.patch(`/admin/users/${userId}/deactivate`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u))
      toast.success(`${email} deactivated.`)
    } catch { toast.error('Action failed.') }
  }

  const handleActivate = async (userId, email) => {
    try {
      await api.patch(`/admin/users/${userId}/activate`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: true } : u))
      toast.success(`${email} activated.`)
    } catch { toast.error('Action failed.') }
  }

  const handleMakeAdmin = async (userId, email) => {
    if (!window.confirm(`Promote ${email} to Admin? This cannot be undone easily.`)) return
    try {
      await api.patch(`/admin/users/${userId}/make-admin`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, user_type: 'admin' } : u))
      toast.success(`${email} is now an admin!`)
    } catch { toast.error('Action failed.') }
  }

  const handleCampaignStatus = async (campaignId, title, newStatus) => {
    const label = newStatus === 'active' ? 'approve' : 'reject'
    if (!window.confirm(`Are you sure you want to ${label} "${title}"?`)) return
    try {
      await api.patch(`/admin/campaigns/${campaignId}/status`, { status: newStatus, note: `Admin ${label}d` })
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c))
      toast.success(`Campaign "${title}" ${label}d!`)
    } catch { toast.error('Action failed.') }
  }

  const tabs = ['overview', 'users', 'campaigns', 'donations']

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '40px', height: '40px' }} />
      <p style={{ color: 'var(--color-text-muted)' }}>Loading admin panel...</p>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            🛡️ Admin Panel
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem' }}>
            System Dashboard
          </h1>
          <a
            href="http://localhost:8000/docs"
            target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
          >
            📋 API Docs ↗
          </a>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: '99px', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize',
                background: activeTab === tab ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                color: activeTab === tab ? 'white' : 'var(--color-text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard icon="👥" label="Total Users"       value={fmt(stats.users.total)}               sub={`+${stats.users.new_last_7_days} this week`} color="#7c3aed" delay={0.05} />
              <StatCard icon="📢" label="Campaigns"         value={fmt(stats.campaigns.total)}           sub={`${stats.campaigns.active} active`}           color="#3b82f6" delay={0.1} />
              <StatCard icon="💰" label="Total Raised"      value={`₹${fmt(stats.donations.total_raised_inr)}`} sub={`${fmt(stats.donations.total_transactions)} transactions`} color="#10b981" delay={0.15} />
              <StatCard icon="🙋" label="Volunteer Opps"   value={fmt(stats.volunteering.opportunities)} sub={`${fmt(stats.volunteering.applications)} applications`} color="#f59e0b" delay={0.2} />
              <StatCard icon="📦" label="In-Kind Offers"   value={fmt(stats.inkind.offers)} color="#ec4899" delay={0.25} />
            </div>

            {/* Quick links */}
            <SectionTitle>Quick Links</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { label: '📋 API Docs (Swagger)',    href: 'http://localhost:8000/docs',   ext: true },
                { label: '🔴 API Docs (ReDoc)',      href: 'http://localhost:8000/redoc',  ext: true },
                { label: '❤️ Health Check',          href: 'http://localhost:8000/health', ext: true },
                { label: '👥 Manage Users',           tab: 'users' },
                { label: '📢 View Campaigns',         tab: 'campaigns' },
                { label: '💰 View Donations',         tab: 'donations' },
              ].map(({ label, href, ext, tab }) => (
                ext ? (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="card"
                    style={{ display: 'block', textDecoration: 'none', padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    {label} ↗
                  </a>
                ) : (
                  <button key={label} onClick={() => setActiveTab(tab)}
                    className="card"
                    style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', width: '100%' }}>
                    {label}
                  </button>
                )
              ))}
            </div>
          </>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <>
            <SectionTitle>All Users ({users.length})</SectionTitle>
            <DataTable
              columns={['Email', 'Name', 'Type', 'Status', 'Joined', 'Actions']}
              rows={users.map(u => [
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{u.email}</span>,
                `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—',
                <Badge text={u.user_type} color={u.user_type === 'admin' ? '#ef4444' : u.user_type === 'organization' ? '#7c3aed' : '#10b981'} />,
                <Badge text={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? '#10b981' : '#6b7280'} />,
                fmtDate(u.created_at),
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {u.is_active ? (
                    <button onClick={() => handleDeactivate(u.id, u.email)} style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontWeight: 600 }}>
                      Ban
                    </button>
                  ) : (
                    <button onClick={() => handleActivate(u.id, u.email)} style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', fontWeight: 600 }}>
                      Unban
                    </button>
                  )}
                  {u.user_type !== 'admin' && (
                    <button onClick={() => handleMakeAdmin(u.id, u.email)} style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 600 }}>
                      → Admin
                    </button>
                  )}
                </div>,
              ])}
              emptyMsg="No users yet."
            />
          </>
        )}

        {/* CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <>
            <SectionTitle>All Campaigns ({campaigns.length})</SectionTitle>
            <DataTable
              columns={['Title', 'Status', 'Goal (₹)', 'Raised (₹)', 'Created', 'Actions']}
              rows={campaigns.map(c => [
                <span style={{ fontWeight: 600 }}>{c.title}</span>,
                <Badge text={c.status} color={
                  c.status === 'active'    ? '#10b981' :
                  c.status === 'draft'     ? '#6b7280' :
                  c.status === 'completed' ? '#3b82f6' :
                  c.status === 'rejected'  ? '#ef4444' : '#f59e0b'
                } />,
                fmt(c.target_amount || 0),
                fmt(c.raised_amount || 0),
                fmtDate(c.created_at),
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {c.status !== 'active' && (
                    <button onClick={() => handleCampaignStatus(c.id, c.title, 'active')}
                      style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', fontWeight: 600 }}>
                      ✅ Approve
                    </button>
                  )}
                  {c.status !== 'rejected' && (
                    <button onClick={() => handleCampaignStatus(c.id, c.title, 'rejected')}
                      style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontWeight: 600 }}>
                      ❌ Reject
                    </button>
                  )}
                  {c.status !== 'archived' && (
                    <button onClick={() => handleCampaignStatus(c.id, c.title, 'archived')}
                      style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 600 }}>
                      📦 Archive
                    </button>
                  )}
                </div>,
              ])}
              emptyMsg="No campaigns yet."
            />
          </>
        )}

        {/* DONATIONS TAB */}
        {activeTab === 'donations' && (
          <>
            <SectionTitle>Recent Donations ({donations.length})</SectionTitle>
            <DataTable
              columns={['Amount (₹)', 'Campaign ID', 'Donor ID', 'Date']}
              rows={donations.map(d => [
                <span style={{ fontWeight: 700, color: '#10b981' }}>₹{fmt(d.amount)}</span>,
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{d.campaign_id.slice(0, 8)}…</span>,
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{d.donor_id ? d.donor_id.slice(0, 8) + '…' : 'Anonymous'}</span>,
                fmtDate(d.created_at),
              ])}
              emptyMsg="No donations yet."
            />
          </>
        )}
      </div>
    </motion.div>
  )
}

export default AdminDashboard
