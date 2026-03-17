import { Routes, Route, Navigate } from 'react-router-dom'
import AdminView from './views/AdminView'
import PublicView from './views/PublicView'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminView />} />
      <Route path="/view" element={<PublicView />} />
      <Route path="/view/:tournamentId" element={<PublicView />} />
    </Routes>
  )
}

export default App
