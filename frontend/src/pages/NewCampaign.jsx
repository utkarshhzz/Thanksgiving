import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import ImageUpload from '../components/ImageUpload.jsx'
import Navbar from '../components/Navbar.jsx'
import { campaignApi } from '../api/campaigns'
import { aiApi } from '../api/ai'

const CAMPAIGN_TYPES = [
  { value: 'FUNDRAISER',       label: '💰 Fundraiser',      sub: 'Raise money for a cause' },
  { value: 'DISASTER_RELIEF',  label: '🆘 Disaster Relief',  sub: 'Emergency support campaigns' },
  { value: 'EDUCATION',        label: '📚 Education',        sub: 'Scholarships, schools, learning' },
  { value: 'HEALTHCARE',       label: '🏥 Healthcare',       sub: 'Medical aid and awareness' },
  { value: 'ENVIRONMENT',      label: '🌱 Environment',      sub: 'Green & sustainability causes' },
  { value: 'COMMUNITY',        label: '🏘️ Community',        sub: 'Local development projects' },
]

function NewCampaign() {
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { campaign_type: 'FUNDRAISER' }
  })
  const [serverError, setServerError] = useState(null)
  const [created, setCreated]         = useState(null)
  const [campaignId, setCampaignId]   = useState(null)

  // AI Improve state
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(null)  // what was improved

  const navigate = useNavigate()
  const selectedType = watch('campaign_type')

  // ── AI Improve handler ────────────────────────────────────────────────────
  const handleAiImprove = async () => {
    const title       = getValues('title')
    const description = getValues('description')
    const category    = getValues('campaign_type')

    if (!title || title.length < 5) {
      toast.error('Enter a title first before using AI Improve.')
      return
    }
    if (!description || description.length < 20) {
      toast.error('Enter a description first (at least 20 characters).')
      return
    }

    setAiLoading(true)
    setAiSuggestions(null)
    try {
      const res = await aiApi.improveCampaign(title, description, category)
      const { improved_title, improved_description, suggestions } = res.data
      // Overwrite the form fields with AI-improved values
      setValue('title', improved_title, { shouldValidate: true })
      setValue('description', improved_description, { shouldValidate: true })
      setAiSuggestions(suggestions)
      toast.success('✨ AI improved your campaign copy!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'AI Improve failed. Add GEMINI_API_KEY to .env'
      toast.error(msg)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const payload = {
        title:         data.title,
        description:   data.description,
        goal_amount:   parseFloat(data.goal_amount),
        campaign_type: data.campaign_type,
        end_date:      data.end_date || null,
      }
      const res = await campaignApi.create(payload)
      setCreated(res.data)
      setCampaignId(res.data.id)
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Could not create campaign.')
    }
  }

  // ── Success state — show image uploader then navigate ─────────────────────
  if (created) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Navbar />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem 1.5rem' }}>
          <motion.div
            className="card card-glow"
            style={{ maxWidth: '520px', width: '100%', padding: '2.5rem 2rem' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.4rem' }}>
                Campaign Created!
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--color-text)' }}>{created.title}</strong>
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: '0.4rem' }}>
                Saved as a <strong>Draft</strong>. Add a cover image to make it stand out.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cover Image (optional)
              </p>
              <ImageUpload
                uploadUrl={`/campaigns/${created.id}/upload-image`}
                label="Campaign Cover Photo"
                onUploaded={() => navigate(`/campaigns/${created.id}`)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link to={`/campaigns/${created.id}`} className="btn btn-primary">
                View & Publish Campaign →
              </Link>
              <Link to="/campaigns" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                Skip — Browse All Campaigns
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/campaigns" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
          ← Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Create a <span className="text-gradient">Campaign</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
            Fill in the details — you can publish anytime after review.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {serverError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.875rem' }}>
              ⚠️ {serverError}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Campaign Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Clean Water for Rajasthan Villages"
              {...register('title', { required: 'Title is required', minLength: { value: 10, message: 'Minimum 10 characters' } })}
              style={{ borderColor: errors.title ? 'var(--color-error)' : undefined }}
            />
            {errors.title && <span className="form-error">{errors.title.message}</span>}
          </div>

          {/* Campaign type */}
          <div className="form-group">
            <label className="form-label">Campaign Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
              {CAMPAIGN_TYPES.map(type => (
                <label key={type.value} style={{ cursor: 'pointer' }}>
                  <input type="radio" value={type.value} {...register('campaign_type', { required: true })} style={{ display: 'none' }} />
                  <div style={{
                    padding: '0.8rem', borderRadius: '12px',
                    border: `1px solid ${selectedType === type.value ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'}`,
                    background: selectedType === type.value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.15s', fontSize: '0.82rem',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.1rem' }}>{type.label}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{type.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description + AI Improve */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Description *</label>
              <button
                type="button"
                onClick={handleAiImprove}
                disabled={aiLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.3rem 0.8rem', borderRadius: '99px',
                  border: '1px solid rgba(124,58,237,0.4)',
                  background: 'rgba(124,58,237,0.1)',
                  color: '#a78bfa', fontSize: '0.78rem', fontWeight: 700,
                  cursor: aiLoading ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {aiLoading ? (
                  <><div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} /> Improving...</>
                ) : (
                  <>✨ AI Improve</>
                )}
              </button>
            </div>
            <textarea
              className="form-input"
              placeholder="Describe your campaign, the cause, and how funds will be used..."
              rows={5}
              {...register('description', { required: 'Description is required', minLength: { value: 30, message: 'Minimum 30 characters' } })}
              style={{ resize: 'vertical', borderColor: errors.description ? 'var(--color-error)' : undefined }}
            />
            {errors.description && <span className="form-error">{errors.description.message}</span>}

            {/* What AI changed */}
            <AnimatePresence>
              {aiSuggestions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    marginTop: '0.75rem', padding: '0.875rem 1rem',
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: '10px', fontSize: '0.8rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: '0.4rem' }}>✨ AI improved your copy:</div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
                    {aiSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setAiSuggestions(null)}
                    style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Goal + end date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Fundraising Goal (₹) *</label>
              <input
                type="number" className="form-input" placeholder="100000" min="1000"
                {...register('goal_amount', { required: 'Goal is required', min: { value: 1000, message: 'Minimum ₹1,000' } })}
                style={{ borderColor: errors.goal_amount ? 'var(--color-error)' : undefined }}
              />
              {errors.goal_amount && <span className="form-error">{errors.goal_amount.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">End Date (optional)</label>
              <input
                type="date" className="form-input"
                min={new Date().toISOString().split('T')[0]}
                {...register('end_date')}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting} style={{ width: '100%' }}>
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Creating campaign...
              </span>
            ) : 'Create Campaign →'}
          </button>
        </motion.form>
      </div>
    </motion.div>
  )
}

export default NewCampaign
