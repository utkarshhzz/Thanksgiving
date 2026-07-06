import api from './client'

export const spacesApi = {
  list:          (params) => api.get('/spaces', { params }),
  get:           (id)     => api.get(`/spaces/${id}`),
  create:        (data)   => api.post('/spaces', data),
  publish:       (id)     => api.patch(`/spaces/${id}/status`, { status: 'active' }),
  mySpaces:      ()       => api.get('/spaces/mine'),
  book:          (id, data) => api.post(`/spaces/${id}/book`, data),
  myBookings:    ()       => api.get('/spaces/bookings/mine'),
  updateBooking: (bookingId, status) => api.patch(`/spaces/bookings/${bookingId}/status`, { status }),
}
