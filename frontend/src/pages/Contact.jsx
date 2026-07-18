// src/pages/Contact.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const contactMethods = [
  { icon: '📧', label: 'Email', value: 'hello@thanksgiving.app', href: 'mailto:hello@thanksgiving.app' },
  { icon: '💬', label: 'WhatsApp Support', value: '+91 98765 43210', href: 'https://wa.me/919876543210' },
  { icon: '📍', label: 'Office', value: 'Bengaluru, Karnataka, India', href: null },
]

export default function Contact() {
  const [form, setForm]     = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.')
      return
    }
    setSending(true)
    // Simulate sending (replace with real API call / Resend when ready)
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    toast.success("Message sent! We'll get back to you within 24 hours. 💜")
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Navbar />

      <section style={{ minHeight: '100vh', padding: '7rem 1.5rem 5rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 60%)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💌</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', marginBottom: '0.75rem' }}>Get in Touch</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem' }}>We'd love to hear from you — partnerships, feedback, or just saying hi.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '3rem', alignItems: 'start' }} className="contact-grid">

            {/* Contact methods */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.5rem' }}>Contact Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {contactMethods.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1.25rem', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: '14px' }}>
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.2rem', color: '#a78bfa' }}>{m.label}</div>
                      {m.href ? (
                        <a href={m.href} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.9rem' }}>
                          {m.value}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{m.value}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#34d399', marginBottom: '0.5rem' }}>⏱ Response Time</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: 0 }}>We typically respond within 24 hours on business days. For urgent matters, use WhatsApp.</p>
              </div>
            </div>

            {/* Contact form */}
            <motion.form onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ background: 'rgba(15,15,35,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '2.5rem', backdropFilter: 'blur(20px)' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.75rem' }}>Send a Message</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {[
                  { name: 'name',  placeholder: 'Your Name *',  type: 'text' },
                  { name: 'email', placeholder: 'Your Email *', type: 'email' },
                ].map(f => (
                  <div key={f.name}>
                    <input
                      id={`contact-${f.name}`}
                      name={f.name} type={f.type} required
                      placeholder={f.placeholder} value={form[f.name]}
                      onChange={handleChange}
                      style={{
                        width: '100%', padding: '0.85rem 1rem', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              <input id="contact-subject" name="subject" type="text" placeholder="Subject"
                value={form.subject} onChange={handleChange}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />

              <textarea id="contact-message" name="message" placeholder="Your message... *"
                required rows={5} value={form.message} onChange={handleChange}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />

              <button type="submit" className="btn btn-primary" disabled={sending}
                style={{ width: '100%', justifyContent: 'center', opacity: sending ? 0.7 : 1 }}>
                {sending ? 'Sending...' : 'Send Message 💌'}
              </button>
            </motion.form>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 700px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </motion.div>
  )
}
