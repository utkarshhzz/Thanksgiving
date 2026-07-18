// src/pages/Onboarding.jsx
// One-time welcome wizard shown after first registration.
// Steps: role → interests → profile → done
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

const CAUSES = [
  { id: 'education',     label: 'Education',     icon: '📚' },
  { id: 'health',        label: 'Health',         icon: '🏥' },
  { id: 'environment',   label: 'Environment',    icon: '🌱' },
  { id: 'disaster',      label: 'Disaster Relief',icon: '🆘' },
  { id: 'community',     label: 'Community',      icon: '🏘️' },
  { id: 'arts',          label: 'Arts & Culture', icon: '🎨' },
  { id: 'animals',       label: 'Animal Welfare', icon: '🐾' },
  { id: 'elderly',       label: 'Elderly Care',   icon: '👴' },
]

const ROLES = [
  { id: 'donor',       icon: '💰', title: 'Donor',       desc: 'I want to fund campaigns that matter' },
  { id: 'volunteer',   icon: '🙋', title: 'Volunteer',   desc: 'I want to give my time and skills' },
  { id: 'both',        icon: '💜', title: 'Both',         desc: 'I want to donate and volunteer' },
]

const slideVariants = {
  enter:  { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit:   { x: -60, opacity: 0 },
}

export default function Onboarding() {
  const [step, setStep]           = useState(0)  // 0=role, 1=causes, 2=profile, 3=done
  const [selectedRole, setRole]   = useState('')
  const [selectedCauses, setCauses] = useState([])
  const [bio, setBio]             = useState('')
  const [saving, setSaving]       = useState(false)
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)

  const toggleCause = (id) =>
    setCauses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const handleFinish = async () => {
    setSaving(true)
    try {
      // Save bio if provided (best-effort)
      if (bio.trim()) {
        await api.patch('/users/me', { bio: bio.trim() }).catch(() => {})
      }
      toast.success('Welcome to ThankGiving! 🎉')
      navigate('/dashboard')
    } catch {
      navigate('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    // Step 0: Role
    <div key="role" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        Welcome{user?.first_name ? `, ${user.first_name}` : ''}!
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>
        Let's personalize your experience. How will you mostly use ThankGiving?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '360px', margin: '0 auto' }}>
        {ROLES.map(r => (
          <button key={r.id} onClick={() => { setRole(r.id); setStep(1) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem 1.5rem',
              borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
              background: selectedRole === r.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${selectedRole === r.id ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
              color: 'var(--color-text)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.border = '2px solid rgba(124,58,237,0.5)'; e.currentTarget.style.background = 'rgba(124,58,237,0.1)' }}
            onMouseLeave={e => {
              if (selectedRole !== r.id) {
                e.currentTarget.style.border = '2px solid rgba(255,255,255,0.08)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }
            }}
          >
            <span style={{ fontSize: '2rem', flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{r.title}</div>
              <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>{r.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Causes
    <div key="causes">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💚</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.6rem', marginBottom: '0.5rem' }}>
          What causes do you care about?
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Select all that apply — we'll show you relevant content.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {CAUSES.map(c => {
          const active = selectedCauses.includes(c.id)
          return (
            <button key={c.id} onClick={() => toggleCause(c.id)}
              style={{
                padding: '1rem', borderRadius: '14px', cursor: 'pointer', textAlign: 'center',
                background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${active ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
                color: 'var(--color-text)', transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{c.icon}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.label}</div>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => setStep(0)} className="btn btn-outline">Back</button>
        <button onClick={() => setStep(2)} className="btn btn-primary" disabled={selectedCauses.length === 0} style={{ opacity: selectedCauses.length === 0 ? 0.5 : 1 }}>
          Continue →
        </button>
      </div>
    </div>,

    // Step 2: Bio
    <div key="profile" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✏️</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.6rem', marginBottom: '0.5rem' }}>
          Tell us a bit about yourself
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Optional — helps orgs know who you are.</p>
      </div>
      <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
        placeholder="E.g. I'm a software engineer from Mumbai passionate about education and climate action..."
        style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text)', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', marginBottom: '1.5rem' }}
      />
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => setStep(1)} className="btn btn-outline">Back</button>
        <button onClick={() => setStep(3)} className="btn btn-primary">
          Almost done →
        </button>
      </div>
    </div>,

    // Step 3: Done
    <div key="done" style={{ textAlign: 'center' }}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
        <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🎉</div>
      </motion.div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '2rem', marginBottom: '1rem' }}>
        You're all set!
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', maxWidth: '380px', margin: '0 auto 2rem' }}>
        Your profile is ready. Start exploring campaigns, volunteer opportunities, and more.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleFinish} disabled={saving} className="btn btn-primary btn-lg">
          {saving ? 'Setting up...' : 'Go to Dashboard →'}
        </button>
      </div>
    </div>,
  ]

  const totalSteps = 4
  const progress = ((step) / (totalSteps - 1)) * 100

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', background: 'radial-gradient(ellipse at 50% 20%, rgba(124,58,237,0.15) 0%, transparent 70%)' }}>
      
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3rem' }}>
        <span style={{ fontSize: '1.8rem' }}>🤝</span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem' }}>
          Thank<span style={{ color: '#a78bfa' }}>Giving</span>
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '560px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '4px', marginBottom: '3rem', overflow: 'hidden' }}>
        <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
          style={{ height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: '99px' }} />
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '560px', background: 'rgba(15,15,35,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '3rem 2.5rem', backdropFilter: 'blur(30px)' }}>
        <AnimatePresence mode="wait">
          <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Skip */}
      {step < 3 && (
        <button onClick={() => navigate('/dashboard')} style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
          Skip for now
        </button>
      )}
    </motion.div>
  )
}
