import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Bracket from '../components/Bracket'
import { fetchTournamentById, fetchTournaments } from '../lib/supabaseService'
import { getMatchCounts, getTournamentDisplayName } from '../utils/bracketUtils'

const SIDEBAR_STYLE = {
  width: '280px',
  minWidth: '280px',
  background: 'rgba(31, 38, 51, 0.4)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRight: '1px solid rgba(0, 245, 255, 0.2)',
  height: 'calc(100vh - 4rem)',
}

export default function PublicView() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleSelectTournament = useCallback(
    (id) => {
      if (id) navigate(`/view/${id}`)
    },
    [navigate]
  )

  useEffect(() => {
    async function loadList() {
      try {
        const all = await fetchTournaments()
        setTournaments(Array.isArray(all) ? all : [])
      } catch (err) {
        console.error('PublicView tournaments list error:', err)
        setTournaments([])
      }
    }
    loadList()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (tournamentId) {
          const data = await fetchTournamentById(tournamentId)
          setTournament(data ?? null)
          if (!data) setError('Tournament not found')
        } else {
          const list = tournaments
          if (list.length > 0 && list[0]?.id) {
            setTournament(list[0])
            navigate(`/view/${list[0].id}`, { replace: true })
          } else {
            setTournament(null)
          }
        }
      } catch (err) {
        console.error('PublicView fetch error:', err)
        setError(err?.message ?? 'Failed to load')
        setTournament(null)
      } finally {
        setLoading(false)
      }
    }
    if (tournamentId) {
      load()
    } else if (tournaments.length > 0) {
      load()
    } else if (tournaments.length === 0 && !tournamentId) {
      setLoading(false)
      setTournament(null)
    }
  }, [tournamentId, tournaments])

  const matchCounts = tournament ? getMatchCounts(tournament) : { completed: 0, upcoming: 0 }
  const displayName = tournament ? getTournamentDisplayName(tournament) : 'Select a tournament'

  if (loading && !tournament && tournaments.length === 0) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#141721', color: 'rgba(240,245,249,0.9)' }}
      >
        <div>Loading Tournament...</div>
      </div>
    )
  }

  if (tournamentId && (error || !tournament)) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ background: '#141721', color: 'rgba(240,245,249,0.9)' }}
      >
        <p>{error || 'Tournament not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/view')}
          style={{
            padding: '8px 16px',
            background: 'rgba(0,245,255,0.15)',
            color: '#00F5FF',
            border: '1px solid rgba(0,245,255,0.4)',
            borderRadius: '8px',
          }}
        >
          Back to tournaments
        </button>
      </div>
    )
  }

  const lastRoundIndex =
    tournament?.rounds?.length > 0 ? tournament.rounds.length - 1 : -1

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ width: '100%', minWidth: '100%' }}
    >
      <header
        className="flex h-16 items-center gap-6 px-6"
        style={{
          background: 'linear-gradient(135deg, rgba(20,23,33,0.95), rgba(42,49,66,0.95))',
          boxShadow: '0 4px 24px rgba(0, 245, 255, 0.1)',
          borderBottom: '1px solid rgba(0,245,255,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded"
            style={{
              backgroundColor: 'rgba(0, 245, 255, 0.2)',
              boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)',
            }}
          >
            <div
              className="h-4 w-4 rounded-sm"
              style={{
                backgroundColor: '#00F5FF',
                boxShadow: '0 0 10px rgba(0, 245, 255, 0.6)',
              }}
            />
          </div>
          <h1 style={{ color: '#F0F5FF', fontSize: '1.25rem', fontWeight: 600 }}>
            ESC Committee
          </h1>
        </div>

        <div className="flex flex-1 max-w-md items-center">
          <span style={{ color: 'rgba(240,245,249,0.9)' }} className="truncate">
            {displayName}
          </span>
        </div>

        {tournament && (
          <div
            className="flex items-center gap-3 rounded-lg border px-3 py-1.5"
            style={{ borderColor: 'rgba(0, 245, 255, 0.2)' }}
          >
            <span className="text-sm" style={{ color: 'rgba(240,245,249,0.8)' }}>
              <span className="font-medium" style={{ color: '#00F5FF' }}>
                {matchCounts?.completed ?? 0}
              </span>
              <span className="ml-1">Completed</span>
            </span>
            <span className="h-4 w-px" style={{ background: 'rgba(0,245,255,0.3)' }} />
            <span className="text-sm" style={{ color: 'rgba(240,245,249,0.8)' }}>
              <span className="font-medium" style={{ color: '#00F5FF' }}>
                {matchCounts?.upcoming ?? 0}
              </span>
              <span className="ml-1">Upcoming</span>
            </span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="flex shrink-0 flex-col overflow-hidden"
          style={SIDEBAR_STYLE}
        >
          <div
            className="border-b px-4 py-3"
            style={{ borderColor: 'rgba(0, 245, 255, 0.2)' }}
          >
            <h2
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(240,245,249,0.8)' }}
            >
              Tournaments
            </h2>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {tournaments.length === 0 ? (
              <p className="px-3 py-4 text-sm" style={{ color: 'rgba(240,245,249,0.5)' }}>
                No tournaments available
              </p>
            ) : (
              <ul className="space-y-1">
                {tournaments.map((t, idx) => {
                  const isSelected = (tournamentId || tournament?.id) === t?.id
                  return (
                    <li key={t?.id ?? `t-${idx}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectTournament(t?.id)}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'rgba(0,245,255,0.15)' : 'transparent',
                          borderWidth: isSelected ? 1 : 0,
                          borderColor: isSelected ? 'rgba(0,245,255,0.3)' : 'transparent',
                          color: '#F0F5FF',
                        }}
                      >
                        {getTournamentDisplayName(t)}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>
        </aside>

        <main
          className="flex flex-1 overflow-hidden"
          style={{ width: '100%', minWidth: 0 }}
        >
          {loading && !tournament ? (
            <div
              className="flex flex-1 items-center justify-center"
              style={{ color: 'rgba(240,245,249,0.6)' }}
            >
              <p>Loading Tournament...</p>
            </div>
          ) : tournament ? (
            <Bracket
              tournament={tournament}
              isReadOnly
              lastRoundIndex={lastRoundIndex}
            />
          ) : (
            <div
              className="flex flex-1 items-center justify-center"
              style={{ color: 'rgba(240,245,249,0.6)' }}
            >
              <p>
                {tournaments.length === 0
                  ? 'No tournaments available'
                  : 'Select a tournament from the list'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
