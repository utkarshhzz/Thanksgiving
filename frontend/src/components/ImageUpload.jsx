/**
 * ImageUpload — drag-and-drop image uploader with local preview.
 *
 * HOW IT WORKS:
 * 1. User picks or drops a file
 * 2. FileReader shows a local preview INSTANTLY (no network call)
 * 3. User clicks "Upload"
 * 4. We send the file using FormData (NOT JSON — files are binary)
 * 5. Backend returns { image_url: "https://res.cloudinary.com/..." }
 * 6. We call onUploaded(url) so parent component can store the URL
 */
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'

function ImageUpload({ uploadUrl, onUploaded, currentUrl, label = "Upload Image" }) {
  const [preview, setPreview]     = useState(currentUrl || null)
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef()

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP)')
      return
    }
    setFile(selectedFile)
    setError(null)
    // FileReader is a browser API — reads file locally, no network
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)  // data:image/jpeg;base64,...
    reader.readAsDataURL(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    // FormData sends files as multipart/form-data (NOT JSON)
    const formData = new FormData()
    formData.append('file', file)  // 'file' must match FastAPI param name

    try {
      const res = await api.post(uploadUrl, formData, {
        // Do NOT set Content-Type manually!
        // Axios sets it to multipart/form-data with the correct boundary automatically
        headers: { 'Content-Type': undefined },
      })
      onUploaded(res.data.image_url || res.data.avatar_url)
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files[0])
        }}
        onClick={() => inputRef.current?.click()}
        animate={{ borderColor: dragging ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}
        style={{
          border: '2px dashed rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(124,58,237,0.05)' : 'rgba(255,255,255,0.02)',
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px' }}
          />
        ) : (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
            <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Drag & drop or click — JPEG, PNG, WebP (max 5MB)
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </motion.div>

      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          ⚠️ {error}
        </p>
      )}

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}
          >
            <button
              onClick={() => { setFile(null); setPreview(currentUrl || null) }}
              className="btn btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="btn btn-primary"
              disabled={uploading}
              style={{ flex: 2 }}
            >
              {uploading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  Uploading...
                </span>
              ) : '⬆️ Upload Image'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ImageUpload
