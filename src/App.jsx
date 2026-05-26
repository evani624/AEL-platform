import { Routes, Route, Navigate } from 'react-router-dom'
import AdminView from './views/AdminView'
import PublicView from './views/PublicView'
import LoginView from './views/LoginView'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* Normal visitors land on the public view; admin/login are not advertised. */}
      <Route path="/" element={<Navigate to="/view" replace />} />
      <Route path="/login" element={<LoginView />} />
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
