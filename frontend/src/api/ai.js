// src/api/ai.js
// AI-powered API calls to the backend Gemini endpoints

import api from './client'

export const aiApi = {
  /**
   * Improve campaign title + description using Gemini.
   * Returns { improved_title, improved_description, suggestions }
   */
  improveCampaign: (title, description, category) =>
    api.post('/ai/campaigns/improve', { title, description, category }),

  /**
   * Get 3 AI-suggested campaigns the donor might like.
   * Returns { suggestions: [{title, reason}] }
   */
  suggestCampaigns: (campaignId) =>
    api.get(`/ai/campaigns/${campaignId}/suggest`),

  /**
   * Get personalised impact summary for logged-in user.
   * Returns { summary, highlight }
   */
  myImpact: () =>
    api.get('/ai/users/me/impact'),
}
