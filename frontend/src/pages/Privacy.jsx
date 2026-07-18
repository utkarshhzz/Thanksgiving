// src/pages/Privacy.jsx
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const sections = [
  {
    title: '1. Information We Collect',
    body: `We collect: (a) Account information — name, email, phone, profile photo when you register; (b) Activity data — donations made, campaigns created, volunteer hours logged, spaces booked, comments posted; (c) Payment data — processed securely via Razorpay/Stripe; ThankGiving does not store full card numbers; (d) Usage data — pages visited, features used, device type, IP address (for fraud prevention); (e) Communications — messages you send us or via the in-app messaging system.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your data to: operate and improve the Platform; personalize your experience (recommended campaigns, matched volunteer opportunities); send transactional emails (donation confirmations, application status, shift reminders); send weekly digest emails (if you opt in); prevent fraud and abuse; comply with legal obligations; analyze aggregate usage to improve Platform performance.`,
  },
  {
    title: '3. Data Sharing',
    body: `We do NOT sell your personal data. We share data with: (a) Organizations — when you donate to or volunteer with them, they see your name and contact info; (b) Service Providers — Razorpay/Stripe (payment), Resend (email), Cloudinary (media storage), all bound by data processing agreements; (c) Law enforcement — when required by court order or to protect user safety; (d) Business transfers — if ThankGiving is acquired, your data may transfer to the new owner with the same protections.`,
  },
  {
    title: '4. Public Information',
    body: `Certain information is public by default: your profile name, earned badges, and leaderboard position. Campaign comments are public. You can opt out of leaderboard visibility in your Profile settings. Donation amounts are kept confidential from other users (organizations see aggregate totals, not individual donor details).`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your data for as long as your account is active. If you delete your account, we delete personal data within 30 days, except: records required for tax or legal compliance (7 years); aggregated/anonymized analytics data (retained indefinitely). Backup copies may persist for up to 90 days.`,
  },
  {
    title: '6. Your Rights',
    body: `Under applicable law (DPDP Act 2023, GDPR for EU users), you have the right to: access your personal data (via Settings > Data Export); correct inaccurate data; delete your account and data; opt out of marketing emails (unsubscribe link in every email); withdraw consent for non-essential data processing. Contact privacy@thanksgiving.app to exercise these rights.`,
  },
  {
    title: '7. Cookies & Tracking',
    body: `We use essential cookies for authentication (JWT storage in httpOnly cookies) and session management. We use analytics cookies (Mixpanel) to understand feature usage. We do not use third-party advertising cookies. You can disable non-essential cookies in your browser settings.`,
  },
  {
    title: '8. Security',
    body: `We protect your data with: TLS 1.3 encryption in transit; AES-256 encryption at rest for sensitive data; bcrypt password hashing; JWT tokens with short expiry; regular penetration testing; ISO 27001-aligned practices. No system is 100% secure — please use a strong, unique password and enable MFA.`,
  },
  {
    title: '9. Children\'s Privacy',
    body: `ThankGiving is not intended for users under 18. We do not knowingly collect data from minors. If you believe a child has registered, contact us at privacy@thanksgiving.app and we will delete the account immediately.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We will notify you of material changes via email and an in-app notification at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.`,
  },
  {
    title: '11. Contact Us',
    body: `Data Protection Officer: dpo@thanksgiving.app\nPrivacy queries: privacy@thanksgiving.app\nPostal: ThankGiving, Bengaluru, Karnataka, India.`,
  },
]

export default function Privacy() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Navbar />

      <section style={{ minHeight: '100vh', padding: '7rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

          <div style={{ marginBottom: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.75rem)', marginBottom: '0.75rem' }}>Privacy Policy</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Last updated: July 2026 · DPDP Act 2023 & GDPR compliant</p>
            <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Your privacy matters. We collect only what we need, never sell your data, and give you full control over your information.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {sections.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: '#34d399', marginBottom: '0.75rem' }}>{s.title}</h2>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>{s.body}</p>
                {i < sections.length - 1 && (
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginTop: '2.5rem' }} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </motion.div>
  )
}
