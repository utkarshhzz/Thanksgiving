// src/components/Footer.jsx
// Site-wide footer — appears on all pages
import { Link } from 'react-router-dom'

const footerLinks = {
  Platform: [
    { to: '/campaigns',   label: 'Browse Campaigns' },
    { to: '/volunteer',   label: 'Volunteer' },
    { to: '/in-kind',     label: 'Donate Goods' },
    { to: '/spaces',      label: 'Share a Space' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ],
  Company: [
    { to: '/about',   label: 'About Us' },
    { to: '/contact', label: 'Contact' },
    { to: '/campaigns/new', label: 'Start a Campaign' },
  ],
  Legal: [
    { to: '/terms',   label: 'Terms of Service' },
    { to: '/privacy', label: 'Privacy Policy' },
  ],
}

const socials = [
  { href: 'https://twitter.com', icon: '𝕏', label: 'Twitter/X' },
  { href: 'https://instagram.com', icon: '📸', label: 'Instagram' },
  { href: 'https://linkedin.com', icon: '💼', label: 'LinkedIn' },
]

export default function Footer() {
  return (
    <footer style={{
      background: 'rgba(5,8,22,0.98)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '3.5rem 1.5rem 2rem',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Top row: brand + columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px,1fr) repeat(3, minmax(120px,1fr))',
          gap: '2.5rem',
          marginBottom: '3rem',
        }}
          className="footer-grid"
        >
          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🤝</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-text)' }}>
                Thank<span style={{ color: '#a78bfa' }}>Giving</span>
              </span>
            </Link>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: '240px' }}>
              Connecting causes with communities. Donate, volunteer, and share — all in one place.
            </p>
            {/* Socials */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              {socials.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', textDecoration: 'none', color: 'inherit',
                    transition: 'background 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none' }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.82rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                {heading}
              </h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {links.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.88rem', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                      onMouseLeave={e => e.currentTarget.style.color = ''}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)', margin: 0 }}>
            © {new Date().getFullYear()} ThankGiving. Made with 💜 for social good.
          </p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link to="/terms"   style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', textDecoration: 'none' }}>Terms</Link>
            <Link to="/privacy" style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/contact" style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
