import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Landing         from './pages/landing.jsx'
import Login           from './pages/Login.jsx'
import Register        from './pages/Register.jsx'
import Dashboard       from './pages/Dashboard.jsx'
import Campaigns       from './pages/Campaigns.jsx'
import CampaignDetail  from './pages/CampaignDetail.jsx'
import NewCampaign     from './pages/NewCampaign.jsx'
import MyDonations     from './pages/MyDonations.jsx'
import Volunteer       from './pages/Volunteer.jsx'
import VolunteerDetail from './pages/VolunteerDetail.jsx'
import MyApplications  from './pages/MyApplications.jsx'
import LogHours        from './pages/LogHours.jsx'
import InKind          from './pages/InKind.jsx'
import Spaces          from './pages/Spaces.jsx'
import SpaceDetail     from './pages/SpaceDetail.jsx'
import ListSpace       from './pages/ListSpace.jsx'
import MyBookings      from './pages/MyBookings.jsx'
import ProtectedRoute  from './components/ProtectedRoute.jsx'

function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* ── Public ── */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ── Campaigns ── */}
          <Route path="/campaigns"           element={<Campaigns />} />
          <Route path="/campaigns/new"       element={<ProtectedRoute><NewCampaign /></ProtectedRoute>} />
          <Route path="/campaigns/donations" element={<ProtectedRoute><MyDonations /></ProtectedRoute>} />
          <Route path="/campaigns/:id"       element={<CampaignDetail />} />

          {/* ── Volunteering ── */}
          <Route path="/volunteer"              element={<Volunteer />} />
          <Route path="/volunteer/applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
          <Route path="/volunteer/log-hours"    element={<ProtectedRoute><LogHours /></ProtectedRoute>} />
          <Route path="/volunteer/:id"          element={<VolunteerDetail />} />

          {/* ── In-Kind Donations ── */}
          <Route path="/in-kind"     element={<ProtectedRoute><InKind /></ProtectedRoute>} />
          <Route path="/in-kind/new" element={<ProtectedRoute><InKind /></ProtectedRoute>} />

          {/* ── Spaces ── */}
          <Route path="/spaces"          element={<Spaces />} />
          <Route path="/spaces/new"      element={<ProtectedRoute><ListSpace /></ProtectedRoute>} />
          <Route path="/spaces/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/spaces/:id"      element={<SpaceDetail />} />

          {/* ── Protected ── */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* ── 404 → home ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}

export default App
