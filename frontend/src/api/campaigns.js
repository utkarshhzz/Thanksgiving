import api from './client'

// Real backend URLs (backend/app/api/v1/routers/campaigns.py + donations.py)
// Campaigns prefix: /campaigns
// Donations prefix: /campaigns/{id}/donations

export const campaignApi = {
  list:        (params) => api.get('/campaigns', { params }),
  get:         (id)     => api.get(`/campaigns/${id}`),
  analytics:   (id)     => api.get(`/campaigns/${id}/analytics`),
  create:      (data)   => api.post('/campaigns', data),
  update:      (id, data) => api.patch(`/campaigns/${id}`, data),
  publish:     (id)     => api.patch(`/campaigns/${id}/status`, { status: 'active' }),
  complete:    (id)     => api.patch(`/campaigns/${id}/status`, { status: 'completed' }),
  cancel:      (id)     => api.patch(`/campaigns/${id}/status`, { status: 'cancelled' }),
  delete:      (id)     => api.delete(`/campaigns/${id}`),

  // Donations — nested under campaigns
  donate:          (id, amount)  => api.post(`/campaigns/${id}/donations`, { amount }),
  listDonations:   (id)          => api.get(`/campaigns/${id}/donations`),
  // "My donations" — returns all donations I have made
  myDonations: () => api.get('/users/me/donations'),

  // Razorpay payment flow
  // Step 1: backend creates a Razorpay order, returns order_id + key_id
  createPaymentOrder: (id, amount) =>
    api.post(`/campaigns/${id}/payment/create-order`, { amount }),

  // Step 2: after user pays in popup, send proof to backend for verification + DB save
  verifyPayment: (id, data) =>
    api.post(`/campaigns/${id}/payment/verify`, data),
}

