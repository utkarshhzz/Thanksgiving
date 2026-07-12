import api from './client'

export const authApi = {
  register:    (data)       => api.post('/auth/register', data),
  login:       (data)       => api.post('/auth/login', data),
  me:          ()           => api.get('/auth/me'),
  updateMe: (data) => api.patch('/users/me', data),

  // Google OAuth — send the credential string returned by Google's popup
  googleLogin: (credential) => api.post('/auth/google', { credential }),
}
