import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import BracketScreen from '../components/BracketScreen'
import AppSkeleton from '../components/AppSkeleton'
import { fetchTournaments } from '../lib/supabaseService'

export default function PublicView() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const all = await fetchTournaments()
        if (mounted) setTournaments(Array.isArray(all) ? all : [])
      } catch (err) {
        console.error('PublicView fetch error:', err)
        if (mounted) setTournaments([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // Default to the first tournament when no id is in the URL.
  useEffect(() => {
    if (!loading && !tournamentId && tournaments.length > 0) {
      navigate(`/view/${tournaments[0].id}`, { replace: true })
    }
  }, [loading, tournamentId, tournaments, navigate])

  if (loading) return <AppSkeleton />

  const currentId = tournamentId || tournaments[0]?.id || null

  return (
    <BracketScreen
      mode="public"
      tournaments={tournaments}
      currentId={currentId}
      loading={false}
      onSelect={(id) => navigate(`/view/${id}`)}
    />
  )
}
