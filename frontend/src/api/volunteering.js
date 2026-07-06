import api from './client'

export const volunteerApi = {
  listOpportunities: (params) => api.get('/volunteering/opportunities', { params }),
  getOpportunity:    (id)     => api.get(`/volunteering/opportunities/${id}`),
  apply:             (id)     => api.post(`/volunteering/opportunities/${id}/apply`),
  myApplications:    ()       => api.get('/volunteering/my-applications'),
  logHours:          (data)   => api.post('/volunteering/hours', data),
  myHours:           ()       => api.get('/volunteering/my-hours'),
}
