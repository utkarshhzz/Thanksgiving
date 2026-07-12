import api from './client'

// Real backend URLs (from backend/app/api/v1/routers/opportunities.py + applications.py + hours.py)
// Opportunities prefix: /opportunities
// Applications: no prefix (routes like /opportunities/{id}/apply, /applications/me)
// Hours: no prefix (routes like /hours/log, /hours/me)

export const volunteerApi = {
  // Opportunities
  listOpportunities: (params) => api.get('/opportunities', { params }),
  getOpportunity:    (id)     => api.get(`/opportunities/${id}`),
  createOpportunity: (data)   => api.post('/opportunities', data),
  updateOpportunity: (id, data) => api.patch(`/opportunities/${id}`, data),
  publishOpportunity:(id)     => api.patch(`/opportunities/${id}/status`, { status: 'active' }),

  // Applications
  apply:           (id)     => api.post(`/opportunities/${id}/apply`, {}),
  myApplications:  ()       => api.get('/applications/me'),
  updateApplication: (id, status) => api.patch(`/applications/${id}/status`, { status }),

  // Hours
  logHours:  (data) => api.post('/hours/log', data),
  myHours:   ()     => api.get('/hours/me'),

  // QR Check-in / Check-out
  generateQrToken: (opportunityId)           => api.post(`/opportunities/${opportunityId}/qr-token`),
  qrCheckin:       (qr_token)                => api.post('/hours/qr-checkin', { qr_token }),
  qrCheckout:      (qr_token, description)   => api.post('/hours/qr-checkout', { qr_token, description }),
}
