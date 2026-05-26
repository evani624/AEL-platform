import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import AppSkeleton from './AppSkeleton'

/**
 * Gates a route behind an active Supabase session. Logged-out users are sent
 * to /login. Hiding the UI is not security — RLS is — but this keeps the admin
 * area out of reach for normal visitors.
 */
export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'authed' | 'anon'

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setStatus(data.session ? 'authed' : 'anon')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setStatus(session ? 'authed' : 'anon')
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (status === 'checking') return <AppSkeleton />
  if (status === 'anon') return <Navigate to="/login" replace />
  return children
}
