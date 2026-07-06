import api from './client'

// Real backend URLs (backend/app/api/v1/routers/spaces.py)
// All under /spaces prefix

export const spacesApi = {
  list:          (params) => api.get('/spaces', { params }),
  get:           (id)     => api.get(`/spaces/${id}`),
  create:        (data)   => api.post('/spaces', data),
  publish:       (id)     => api.patch(`/spaces/${id}/status`, { status: 'active' }),
  deactivate:    (id)     => api.patch(`/spaces/${id}/status`, { status: 'inactive' }),
  mySpaces:      ()       => api.get('/spaces/mine'),

  // Bookings
  book:          (id, data)       => api.post(`/spaces/${id}/book`, data),
  myBookings:    ()               => api.get('/spaces/bookings/mine'),
  updateBooking: (bookingId, status) =>
    api.patch(`/spaces/bookings/${bookingId}/status`, { status }),
}
