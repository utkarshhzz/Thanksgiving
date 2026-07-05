// Navigate: redirects to another route programmatically.
// useLocation: gives us the current URL so we can remember where
//              the user was trying to go, and send them back after login.
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// children: in React, this is whatever JSX is between the opening
//           and closing tags of a component.
// Example: <ProtectedRoute><Dashboard /></ProtectedRoute>
// Here, children = <Dashboard />
function ProtectedRoute({ children }) {
  // Read the isLoggedIn function from the store.
  // When the store changes, this component re-renders automatically.
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const location = useLocation()

  if (!isLoggedIn()) {
    // User is NOT logged in — redirect to /login.
    // state={{ from: location }} passes the current URL along,
    // so after login we can send them back to where they were.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User IS logged in — render whatever page was inside <ProtectedRoute>.
  return children
}

export default ProtectedRoute
