import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import ImageUpload from '../components/ImageUpload.jsx'

import Navbar from '../components/Navbar.jsx'
import { campaignApi } from '../api/campaigns'

const CAMPAIGN_TYPES = [
  { value: 'FUNDRAISER',       label: '💰 Fundraiser',      sub: 'Raise money for a cause' },
  { value: 'DISASTER_RELIEF',  label: '🆘 Disaster Relief',  sub: 'Emergency support campaigns' },
  { value: 'EDUCATION',        label: '📚 Education',        sub: 'Scholarships, schools, learning' },
  { value: 'HEALTHCARE',       label: '🏥 Healthcare',       sub: 'Medical aid and awareness' },
  { value: 'ENVIRONMENT',      label: '🌱 Environment',      sub: 'Green & sustainability causes' },
  { value: 'COMMUNITY',        label: '🏘️ Community',        sub: 'Local development projects' },
]

function NewCampaign() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { campaign_type: 'FUNDRAISER' }
  })
  const [serverError, setServerError] = useState(null)
  const [created, setCreated]         = useState(null)
  const [campaignId, setCampaignId] = useState(null)

  const navigate = useNavigate()

  const selectedType = watch('campaign_type')

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
      setCampaignId(res.data.id)  // save so ImageUpload knows where to upload
    } catch (err) {
      setServerError(
        err.response?.data?.error?.message || 'Could not create campaign.'
      )
    }
  }

  // Success state — show image uploader then navigate
  if (created) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Navbar />
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '6rem 1.5rem',
        }}>
          <motion.div
            className="card card-glow"
            style={{ maxWidth: '520px', width: '100%', padding: '2.5rem 2rem' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            {/* ── Header ── */}
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

            {/* ── Image uploader ── */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{
                fontWeight: 600, fontSize: '0.85rem',
                marginBottom: '0.75rem', color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Cover Image (optional)
              </p>
              <ImageUpload
                uploadUrl={`/campaigns/${created.id}/upload-image`}
                label="Campaign Cover Photo"
                onUploaded={() => {
                  // Image saved — navigate to the new campaign page
                  navigate(`/campaigns/${created.id}`)
                }}
              />
            </div>

            {/* ── Skip + go now ── */}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 style={{
            fontFamily:  'var(--font-heading)',
            fontWeight:  900,
            fontSize:    'clamp(1.8rem, 4vw, 2.5rem)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}>
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
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.875rem',
            }}>
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

          {/* Campaign type — card grid selection */}
          <div className="form-group">
            <label className="form-label">Campaign Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
              {CAMPAIGN_TYPES.map(type => (
                <label key={type.value} style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value={type.value}
                    {...register('campaign_type', { required: true })}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    padding:      '0.8rem',
                    borderRadius: '12px',
                    border:       `1px solid ${selectedType === type.value ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'}`,
                    background:   selectedType === type.value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                    transition:   'all 0.15s',
                    fontSize:     '0.82rem',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.1rem' }}>{type.label}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{type.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-input"
              placeholder="Describe your campaign, the cause, and how funds will be used..."
              rows={5}
              {...register('description', { required: 'Description is required', minLength: { value: 30, message: 'Minimum 30 characters' } })}
              style={{ resize: 'vertical', borderColor: errors.description ? 'var(--color-error)' : undefined }}
            />
            {errors.description && <span className="form-error">{errors.description.message}</span>}
          </div>

          {/* Goal + end date row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Fundraising Goal (₹) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="100000"
                min="1000"
                {...register('goal_amount', {
                  required: 'Goal is required',
                  min: { value: 1000, message: 'Minimum ₹1,000' },
                })}
                style={{ borderColor: errors.goal_amount ? 'var(--color-error)' : undefined }}
              />
              {errors.goal_amount && <span className="form-error">{errors.goal_amount.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">End Date (optional)</label>
              <input
                type="date"
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
                {...register('end_date')}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            style={{ width: '100%' }}
          >
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
