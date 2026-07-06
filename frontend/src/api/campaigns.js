import api from './client'

export const campaignApi = {
  list:    (params) => api.get('/campaigns', { params }),
  get:     (id)     => api.get(`/campaigns/${id}`),
  create:  (data)   => api.post('/campaigns', data),
  publish: (id)     => api.patch(`/campaigns/${id}/status`, { status: 'active' }),
  donate:  (id, amount) => api.post(`/campaigns/${id}/donate`, { amount }),
  myDonations: ()   => api.get('/campaigns/my-donations'),
}
