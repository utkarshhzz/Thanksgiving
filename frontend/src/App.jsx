// BrowserRouter: wraps the whole app and enables URL-based routing.
// Routes: the container that holds all route definitions.
// Route: maps one URL path to one component (page).
// Navigate: programmatically redirect (like FastAPI's RedirectResponse).
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// AnimatePresence from Framer Motion allows components to animate
// when they ENTER and EXIT the screen. Without it, components just
// appear/disappear instantly.
import { AnimatePresence } from 'framer-motion'

// Pages — each is a full-screen component
// (we'll create these in M4 and M5)
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'

// A wrapper that blocks access to protected pages if not logged in.
// (we'll create this next)
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    // BrowserRouter makes the browser's URL bar work with React.
    <BrowserRouter>
      {/* AnimatePresence watches its children. When a child is
          added (page enters) or removed (page leaves), it triggers
          their entry/exit animations. mode="wait" means: wait for
          the exit animation to finish before showing the new page. */}
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes — anyone can visit these */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — must be logged in.
              ProtectedRoute checks auth and redirects to /login if not. */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all: any unknown URL → redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}

export default App
