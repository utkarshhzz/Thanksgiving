// src/pages/Terms.jsx
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using ThankGiving ("the Platform"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the Platform. These terms apply to all users — donors, volunteers, organizations, and space hosts.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 18 years old to create an account. Organizations registering on the Platform must be legally incorporated entities (NGOs, Section 8 companies, trusts, or societies) and must provide accurate KYC information during onboarding.`,
  },
  {
    title: '3. User Accounts',
    body: `You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately at security@thanksgiving.app if you suspect unauthorized access. ThankGiving reserves the right to suspend accounts that violate these terms.`,
  },
  {
    title: '4. Crowdfunding Campaigns',
    body: `Organizations may create campaigns to raise funds for verified social causes. All campaigns are subject to review and must comply with our content policies. Funds collected are held in trust and disbursed to the organization after verification. ThankGiving does not charge a platform fee on donations; payment processing fees apply at standard rates (2.9% + ₹2 per transaction).`,
  },
  {
    title: '5. Volunteering',
    body: `Volunteer opportunities posted on the Platform must be legitimate, non-commercial, and aligned with social good. Organizations are responsible for volunteer safety, adequate supervision, and maintaining accurate hour logs. Volunteers agree that ThankGiving is not liable for any injury or loss occurring during volunteer activities.`,
  },
  {
    title: '6. In-Kind Donations',
    body: `Donors offering goods confirm that items are safe, legally owned, and accurately described. Organizations accepting in-kind donations are responsible for inspection and safe distribution. ThankGiving is not responsible for the condition of donated goods.`,
  },
  {
    title: '7. Space Sharing',
    body: `Space hosts are responsible for maintaining safe, accessible premises. Hosts must hold adequate insurance. Bookings are agreements between host and booker — ThankGiving facilitates but is not a party to these agreements. Disputes should first be resolved between the parties before escalating to ThankGiving support.`,
  },
  {
    title: '8. Prohibited Conduct',
    body: `You may not: use the Platform for fraudulent or deceptive purposes; post false or misleading campaign information; harass, abuse, or harm other users; attempt to circumvent Platform fees; violate any applicable law; or engage in money laundering or terrorism financing. Violation of these rules will result in immediate account termination and may be reported to law enforcement.`,
  },
  {
    title: '9. Intellectual Property',
    body: `All Platform content, design, and software are owned by ThankGiving or its licensors. Users retain ownership of content they create (campaign stories, photos, etc.) but grant ThankGiving a non-exclusive license to display and promote such content on the Platform and in marketing materials.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `To the fullest extent permitted by law, ThankGiving shall not be liable for indirect, incidental, or consequential damages. Our total liability for any claim shall not exceed the amount you paid to us in the past 12 months. The Platform is provided "as is" without warranty of any kind.`,
  },
  {
    title: '11. Changes to Terms',
    body: `We may update these Terms at any time. Material changes will be communicated via email and a notice on the Platform. Continued use after the effective date constitutes acceptance of the revised Terms.`,
  },
  {
    title: '12. Governing Law',
    body: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.`,
  },
  {
    title: '13. Contact',
    body: `For legal questions about these Terms, contact: legal@thanksgiving.app. For support, visit our Contact page.`,
  },
]

export default function Terms() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Navbar />

      <section style={{ minHeight: '100vh', padding: '7rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

          <div style={{ marginBottom: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.75rem)', marginBottom: '0.75rem' }}>Terms of Service</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Last updated: July 2026 · Version 1.0</p>
            <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Please read these Terms carefully before using ThankGiving. By creating an account, you agree to be bound by these terms.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {sections.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: '#a78bfa', marginBottom: '0.75rem' }}>{s.title}</h2>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: '0.95rem' }}>{s.body}</p>
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
