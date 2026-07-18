// src/pages/About.jsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const stats = [
  { value: '100%', label: 'Open & Transparent', icon: '🔓' },
  { value: '₹0', label: 'Platform Fee on Donations', icon: '💜' },
  { value: '4', label: 'Ways to Give Back', icon: '🌱' },
  { value: '∞', label: 'Social Impact', icon: '🚀' },
]

const values = [
  { icon: '🤝', title: 'Radical Transparency', desc: 'Every rupee tracked. Every hour logged. Every impact reported. Donors always know where their contribution goes.' },
  { icon: '⚡', title: 'Zero Friction', desc: 'Giving should feel as easy as ordering food. We obsess over removing every step that stands between generosity and impact.' },
  { icon: '🌐', title: 'Community First', desc: 'We are not just a platform — we are a movement. Every feature is built to deepen connections between givers and causes.' },
  { icon: '🔬', title: 'AI-Powered Impact', desc: 'We use AI to match volunteers with opportunities, help orgs craft better campaigns, and surface the causes you care about most.' },
]

const team = [
  { name: 'Utkarsh Kumar', role: 'Founder & CEO', emoji: '👨‍💻', bio: 'Building tech for social good.' },
  { name: 'The Build Team', role: 'Engineering', emoji: '⚙️', bio: 'Turning ideas into impact at scale.' },
  { name: 'You', role: 'Community Member', emoji: '💜', bio: 'Every donor, volunteer, and org on this platform.' },
]

export default function About() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Navbar />

      {/* Hero */}
      <section style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8rem 1.5rem 5rem', textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%)',
      }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>🤝</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3.25rem)', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            We believe generosity should be <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>effortless</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
            ThankGiving is India's first unified platform for crowdfunding, volunteering, in-kind donations, and space sharing — purpose-built for nonprofits, NGOs, and the communities they serve.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/campaigns" className="btn btn-primary">Browse Campaigns →</Link>
            <Link to="/contact" className="btn btn-outline">Get in Touch</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--color-bg-card)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '2rem' }}>
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '2.25rem', color: '#a78bfa' }}>{s.value}</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2.25rem)', marginBottom: '1.5rem' }}>Our Mission</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: '1rem' }}>
          India has 3.3 million NGOs but most struggle with fragmented tools, donor fatigue, and volunteer retention. We're fixing that by building a single, beautiful platform that makes every act of giving — money, time, goods, or space — feel rewarding and visible.
        </p>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
          We're not just a tech company. We're a team of builders who believe technology should serve humanity — especially those who dedicate their lives to it.
        </p>
      </section>

      {/* Values */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--color-bg-card)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2.25rem)', textAlign: 'center', marginBottom: '3rem' }}>What We Stand For</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1.5rem' }}>
            {values.map((v, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: '18px', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{v.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.6rem' }}>{v.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2.25rem)', textAlign: 'center', marginBottom: '3rem' }}>The Team</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.5rem' }}>
          {team.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{t.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{t.name}</div>
              <div style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.6rem' }}>{t.role}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{t.bio}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.15) 0%, transparent 70%)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '1rem' }}>Ready to make a difference?</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Join thousands of donors, volunteers, and nonprofits already on ThankGiving.</p>
        <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>Join for Free →</Link>
      </section>

      <Footer />
    </motion.div>
  )
}
