import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'

import Navbar from '../components/Navbar.jsx'
import { spacesApi } from '../api/spaces'

const SPACE_TYPES = [
  { value: 'HALL',        label: '🏛️ Hall',         sub: 'Event halls & auditoriums' },
  { value: 'OFFICE',      label: '🏢 Office',        sub: 'Meeting rooms & co-working' },
  { value: 'WAREHOUSE',   label: '🏭 Warehouse',     sub: 'Storage & distribution' },
  { value: 'OUTDOOR',     label: '🌳 Outdoor',       sub: 'Open grounds & gardens' },
  { value: 'CLASSROOM',   label: '📚 Classroom',     sub: 'Training & education' },
  { value: 'KITCHEN',     label: '🍳 Kitchen',       sub: 'Community kitchens' },
]

const COMMON_AMENITIES = ['WiFi', 'Parking', 'AC', 'Projector', 'Whiteboard', 'Kitchen', 'Washroom', 'Generator', 'Stage', 'Sound System']

function ListSpace() {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { space_type: 'HALL', selectedAmenities: [] }
  })
  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [serverError, setServerError] = useState(null)
  const [created, setCreated]         = useState(null)
  const navigate = useNavigate()

  const selectedType = watch('space_type')

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    )
  }

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const res = await spacesApi.create({
        name:        data.name,
        space_type:  data.space_type,
        description: data.description,
        capacity:    parseInt(data.capacity),
        city:        data.city,
        address:     data.address,
        amenities:   selectedAmenities.join(', ') || null,
      })
      setCreated(res.data)
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Could not create space listing.')
    }
  }

  if (created) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Navbar />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem 1.5rem' }}>
          <motion.div
            className="card card-glow"
            style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              Space Listed!
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--color-text)' }}>{created.name}</strong>
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Saved as <strong>Draft</strong>. Publish it so nonprofits can book it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to={`/spaces/${created.id}`} className="btn btn-primary">View & Publish →</Link>
              <Link to="/spaces" className="btn btn-ghost">Browse All Spaces</Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <Link to="/spaces" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            List Your <span className="text-gradient">Space</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
            Make your venue available to nonprofits for events, training, and community gatherings.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {serverError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.875rem' }}>
              ⚠️ {serverError}
            </div>
          )}

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Space Name *</label>
            <input className="form-input" placeholder="e.g. Sunshine Community Hall"
              {...register('name', { required: 'Name is required', minLength: { value: 5, message: 'Minimum 5 characters' } })}
              style={{ borderColor: errors.name ? 'var(--color-error)' : undefined }}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          {/* Space type cards */}
          <div className="form-group">
            <label className="form-label">Space Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
              {SPACE_TYPES.map(type => (
                <label key={type.value} style={{ cursor: 'pointer' }}>
                  <input type="radio" value={type.value} {...register('space_type')} style={{ display: 'none' }} />
                  <div style={{
                    padding: '0.8rem', borderRadius: '12px',
                    border: `1px solid ${selectedType === type.value ? '#a78bfa' : 'rgba(255,255,255,0.08)'}`,
                    background: selectedType === type.value ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.15s', fontSize: '0.82rem',
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
            <textarea className="form-input" rows={4}
              placeholder="Describe your space, its features, suitable events..."
              {...register('description', { required: 'Required', minLength: { value: 20, message: 'Minimum 20 characters' } })}
              style={{ resize: 'vertical', borderColor: errors.description ? 'var(--color-error)' : undefined }}
            />
            {errors.description && <span className="form-error">{errors.description.message}</span>}
          </div>

          {/* Capacity + City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Capacity (people) *</label>
              <input type="number" min="1" className="form-input" placeholder="100"
                {...register('capacity', { required: 'Required', min: { value: 1, message: 'Min 1' } })}
                style={{ borderColor: errors.capacity ? 'var(--color-error)' : undefined }}
              />
              {errors.capacity && <span className="form-error">{errors.capacity.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">City *</label>
              <input className="form-input" placeholder="e.g. Mumbai"
                {...register('city', { required: 'Required' })}
                style={{ borderColor: errors.city ? 'var(--color-error)' : undefined }}
              />
              {errors.city && <span className="form-error">{errors.city.message}</span>}
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Full Address</label>
            <input className="form-input" placeholder="Street, area, pincode"
              {...register('address')}
            />
          </div>

          {/* Amenities toggle chips */}
          <div className="form-group">
            <label className="form-label">Amenities (select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {COMMON_AMENITIES.map(a => (
                <button
                  key={a} type="button"
                  onClick={() => toggleAmenity(a)}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: '99px', fontSize: '0.8rem',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${selectedAmenities.includes(a) ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
                    background: selectedAmenities.includes(a) ? 'rgba(167,139,250,0.15)' : 'transparent',
                    color: selectedAmenities.includes(a) ? '#a78bfa' : 'var(--color-text-muted)',
                  }}
                >
                  {selectedAmenities.includes(a) ? '✓ ' : ''}{a}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting} style={{ width: '100%' }}>
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Creating listing...
              </span>
            ) : 'List Space →'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}

export default ListSpace
