import api from './client'

export const inKindApi = {
  myOffers:  () => api.get('/in-kind/my-offers'),
  orgOffers: (orgId) => api.get(`/in-kind/org/${orgId}`),
  create:    (data)  => api.post('/in-kind', data),
  updateStatus: (id, status) => api.patch(`/in-kind/${id}/status`, { status }),
}
