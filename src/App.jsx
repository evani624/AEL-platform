import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import AdminView from './views/AdminView'
import PublicView from './views/PublicView'
import LoginView from './views/LoginView'
import SetPasswordView from './views/SetPasswordView'
import ProtectedRoute from './components/ProtectedRoute'
import { supabase } from './lib/supabaseClient'
import { takeAuthRedirect } from './lib/authLanding'

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    // Invite / recovery email links land on the Supabase Site URL (the app root)
    // with their tokens in the URL. Send that first landing to /set-password.
    // This effect runs after the child route effects (incl. the "/" -> /view
    // redirect), so it wins; takeAuthRedirect() makes it fire exactly once.
    if (takeAuthRedirect()) {
      navigate('/set-password', { replace: true })
    }

    // Recovery links also emit this once Supabase has parsed the URL.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/set-password', { replace: true })
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  return (
    <Routes>
      {/* Normal visitors land on the public view; admin/login are not advertised. */}
      <Route path="/" element={<Navigate to="/view" replace />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/set-password" element={<SetPasswordView />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminView />
          </ProtectedRoute>
        }
      />
      <Route path="/view" element={<PublicView />} />
      <Route path="/view/:tournamentId" element={<PublicView />} />
    </Routes>
  )
}

export default App
