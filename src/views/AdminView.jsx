import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BracketScreen from '../components/BracketScreen'
import AddTeamModal from '../components/AddTeamModal'
import MatchResultModal from '../components/MatchResultModal'
import TournamentFormModal from '../components/TournamentFormModal'
import ShareLinkModal from '../components/ShareLinkModal'
import Toasts from '../components/Toasts'
import AppSkeleton from '../components/AppSkeleton'
import { supabase } from '../lib/supabaseClient'
import { findMatch } from '../utils/bracketUtils'
import {
  fetchTournaments,
  createTournament as createTournamentSupabase,
  updateTournament as updateTournamentSupabase,
  deleteTournament as deleteTournamentSupabase,
  upsertMatch,
  updateNextMatchWithWinner,
} from '../lib/supabaseService'

export default function AdminView() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])

  const [addTeamModal, setAddTeamModal] = useState({ open: false, match: null, slot: null })
  const [matchResultModal, setMatchResultModal] = useState({ open: false, match: null })
  const [tournamentForm, setTournamentForm] = useState({ open: false, mode: 'create', initial: null })
  const [shareModal, setShareModal] = useState({ open: false, tournament: null })

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId)

  const pushToast = useCallback(({ title, sub, icon = 'check', flavor }) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { id, title, sub, icon, flavor }])
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250)
    }, 3000)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTournaments()
        setTournaments(data)
        if (data.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(data[0].id)
        }
      } catch (err) {
        setError(err.message)
        setTournaments([])
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------- auth
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    navigate('/view')
  }, [navigate])

  // ---------------- tournament CRUD
  const handleAddTournament = useCallback(() => {
    setTournamentForm({ open: true, mode: 'create', initial: null })
  }, [])

  const handleEditTournament = useCallback((tournament) => {
    setTournamentForm({ open: true, mode: 'edit', initial: tournament })
  }, [])

  const handleSubmitTournament = useCallback(
    async ({ name, game, category, teamSize }) => {
      try {
        if (tournamentForm.mode === 'edit' && tournamentForm.initial) {
          const id = tournamentForm.initial.id
          await updateTournamentSupabase(id, { name, game, category })
          setTournaments((prev) =>
            prev.map((t) => (t.id === id ? { ...t, name: name.trim(), game: game.trim(), category } : t))
          )
          pushToast({ title: 'Tournament updated', sub: name, icon: 'check' })
        } else {
          const newTournament = await createTournamentSupabase({ name, game, category, teamSize })
          setTournaments((prev) => [newTournament, ...prev])
          setSelectedTournamentId(newTournament.id)
          pushToast({ title: 'Tournament created', sub: `${game} · ${teamSize} teams`, icon: 'sparkles' })
        }
        setTournamentForm({ open: false, mode: 'create', initial: null })
      } catch (err) {
        setError(err.message)
      }
    },
    [tournamentForm, pushToast]
  )

  const handleDeleteTournament = useCallback(
    async (id) => {
      if (!window.confirm('Delete this tournament? This cannot be undone.')) return
      try {
        await deleteTournamentSupabase(id)
        setTournaments((prev) => prev.filter((t) => t.id !== id))
        setSelectedTournamentId((current) => {
          if (current !== id) return current
          const remaining = tournaments.filter((t) => t.id !== id)
          return remaining.length > 0 ? remaining[0].id : null
        })
        pushToast({ title: 'Tournament deleted', icon: 'trash' })
      } catch (err) {
        setError(err.message)
      }
    },
    [tournaments, pushToast]
  )

  const handleDeleteFromForm = useCallback(() => {
    const id = tournamentForm.initial?.id
    setTournamentForm({ open: false, mode: 'create', initial: null })
    if (id) setTimeout(() => handleDeleteTournament(id), 60)
  }, [tournamentForm, handleDeleteTournament])

  // ---------------- share
  const handleShare = useCallback((tournament) => {
    setShareModal({ open: true, tournament })
  }, [])

  // ---------------- bracket interactions
  const handleSlotClick = useCallback(
    (match, slot) => {
      if (!selectedTournamentId) return
      if (slot === null) {
        setMatchResultModal({ open: true, match })
      } else {
        setAddTeamModal({ open: true, match, slot })
      }
    },
    [selectedTournamentId]
  )

  const handleAddTeamConfirm = useCallback(
    async (teamData) => {
      const { match, slot } = addTeamModal
      if (!match || !slot || !selectedTournamentId) return

      const team = {
        id: `${match.id}-${slot}`,
        name: teamData.name,
        color: teamData.color,
      }

      try {
        await upsertMatch(selectedTournamentId, match.id, {
          [slot]: { name: team.name, color: team.color },
        })
        setTournaments((prev) =>
          prev.map((t) => {
            if (t.id !== selectedTournamentId) return t
            return {
              ...t,
              rounds: t.rounds.map((round) => ({
                ...round,
                matches: round.matches.map((m) => (m.id === match.id ? { ...m, [slot]: team } : m)),
              })),
            }
          })
        )
        setAddTeamModal({ open: false, match: null, slot: null })
        pushToast({ title: 'Team added', sub: team.name, icon: 'check', flavor: 'cyan' })
      } catch (err) {
        setError(err.message)
      }
    },
    [addTeamModal, selectedTournamentId, pushToast]
  )

  const handleDeleteTeam = useCallback(
    async (match, slot) => {
      if (!selectedTournamentId) return

      const team = slot === 'team1' ? match.team1 : match.team2
      if (!team) return

      const found = findMatch(
        tournaments.find((t) => t.id === selectedTournamentId),
        match.id
      )

      try {
        const updates = { [slot]: null }
        if (match.winnerId === team.id) {
          updates.winnerId = null
          updates.status = 'upcoming'
        }
        await upsertMatch(selectedTournamentId, match.id, updates)

        if (found?.match.nextMatchId) {
          const nextMatch = tournaments
            .find((t) => t.id === selectedTournamentId)
            ?.rounds.flatMap((r) => r.matches)
            .find((m) => m.id === found.match.nextMatchId)
          if (nextMatch?.team1?.id === team.id || nextMatch?.team2?.id === team.id) {
            const nextSlot = nextMatch.team1?.id === team.id ? 'team1' : 'team2'
            await upsertMatch(selectedTournamentId, found.match.nextMatchId, { [nextSlot]: null })
          }
        }

        setTournaments((prev) =>
          prev.map((t) => {
            if (t.id !== selectedTournamentId) return t
            return {
              ...t,
              rounds: t.rounds.map((round) => ({
                ...round,
                matches: round.matches.map((m) => {
                  if (m.id === match.id) {
                    const up = { [slot]: null }
                    if (m.winnerId === team.id) {
                      up.winnerId = null
                      up.status = 'upcoming'
                    }
                    return { ...m, ...up }
                  }
                  if (found?.match.nextMatchId && m.id === found.match.nextMatchId) {
                    const up = {}
                    if (m.team1?.id === team.id) up.team1 = null
                    if (m.team2?.id === team.id) up.team2 = null
                    return Object.keys(up).length ? { ...m, ...up } : m
                  }
                  return m
                }),
              })),
            }
          })
        )
      } catch (err) {
        setError(err.message)
      }
    },
    [selectedTournamentId, tournaments]
  )

  const handleMatchResultConfirm = useCallback(
    async ({ status, winnerId, team1Score, team2Score }) => {
      const { match } = matchResultModal
      if (!match || !selectedTournamentId) return

      const found = findMatch(
        tournaments.find((t) => t.id === selectedTournamentId),
        match.id
      )
      if (!found) return

      const roundIndex =
        tournaments.find((t) => t.id === selectedTournamentId)?.rounds?.indexOf(found.round) ?? -1
      const matchIndex = found.round.matches.indexOf(found.match)
      const isFinalMatch = !found.match.nextMatchId

      const isFinalState = status === 'final'
      const winner =
        isFinalState && winnerId ? (match.team1?.id === winnerId ? match.team1 : match.team2) : null
      const winnerIdToSave = winner ? winner.id : null
      const s1 = team1Score ?? null
      const s2 = team2Score ?? null

      try {
        await upsertMatch(selectedTournamentId, match.id, {
          status,
          winnerId: winnerIdToSave,
          team1Score: s1,
          team2Score: s2,
        })
        // Only a Final result advances a winner to the next round.
        if (isFinalState && winner && !isFinalMatch) {
          await updateNextMatchWithWinner(selectedTournamentId, roundIndex, matchIndex, winner)
        }

        const winnerWithPath = winner ? { ...winner, isWinningPath: true } : null
        const nextSlot = matchIndex % 2 === 0 ? 'team1' : 'team2'

        setTournaments((prev) =>
          prev.map((t) => {
            if (t.id !== selectedTournamentId) return t
            return {
              ...t,
              rounds: t.rounds.map((round) => ({
                ...round,
                matches: round.matches.map((m) => {
                  if (m.id === match.id) {
                    return { ...m, status, winnerId: winnerIdToSave, team1Score: s1, team2Score: s2 }
                  }
                  if (
                    isFinalState &&
                    winner &&
                    !isFinalMatch &&
                    found.match.nextMatchId &&
                    m.id === found.match.nextMatchId
                  ) {
                    return { ...m, [nextSlot]: winnerWithPath }
                  }
                  return m
                }),
              })),
            }
          })
        )
        setMatchResultModal({ open: false, match: null })
        if (isFinalState) {
          pushToast({ title: 'Result saved', sub: 'Winner advanced to next round', icon: 'crown' })
        } else if (status === 'in_progress') {
          pushToast({ title: 'Match marked in progress', icon: 'play', flavor: 'cyan' })
        } else {
          pushToast({ title: 'Match set to upcoming', icon: 'check' })
        }
      } catch (err) {
        setError(err.message)
      }
    },
    [matchResultModal, selectedTournamentId, tournaments, pushToast]
  )

  if (loading) return <AppSkeleton />

  const addTeamLabel = addTeamModal.match
    ? `R${(addTeamModal.match._roundNumber ?? 0) + 1} · M${(addTeamModal.match._matchIndex ?? 0) + 1}`
    : 'Bracket slot'

  return (
    <>
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 400,
            textAlign: 'center',
            padding: '8px 16px',
            fontSize: 13,
            color: '#F9A8D4',
            background: 'rgba(244,114,182,0.12)',
            borderBottom: '1px solid rgba(244,114,182,0.3)',
          }}
        >
          {error}
        </div>
      )}

      <BracketScreen
        mode="admin"
        tournaments={tournaments}
        currentId={selectedTournamentId}
        loading={false}
        onSelect={setSelectedTournamentId}
        onAddTournament={handleAddTournament}
        onEditTournament={handleEditTournament}
        onDeleteTournament={handleDeleteTournament}
        onShare={handleShare}
        onSlotClick={handleSlotClick}
        onDeleteTeam={handleDeleteTeam}
        onLogout={handleLogout}
      >
        {addTeamModal.open && (
          <AddTeamModal
            isOpen
            slotLabel={addTeamLabel}
            onClose={() => setAddTeamModal({ open: false, match: null, slot: null })}
            onConfirm={handleAddTeamConfirm}
          />
        )}

        {matchResultModal.open && (
          <MatchResultModal
            isOpen
            match={matchResultModal.match}
            game={selectedTournament?.game}
            onClose={() => setMatchResultModal({ open: false, match: null })}
            onConfirm={handleMatchResultConfirm}
          />
        )}

        {tournamentForm.open && (
          <TournamentFormModal
            isOpen
            mode={tournamentForm.mode}
            initial={tournamentForm.initial}
            onClose={() => setTournamentForm({ open: false, mode: 'create', initial: null })}
            onSubmit={handleSubmitTournament}
            onDelete={handleDeleteFromForm}
          />
        )}

        {shareModal.open && (
          <ShareLinkModal
            isOpen
            tournament={shareModal.tournament}
            onClose={() => setShareModal({ open: false, tournament: null })}
            onCopied={() => pushToast({ title: 'Public link copied', sub: 'Share with your community', icon: 'link' })}
          />
        )}

        <Toasts items={toasts} />
      </BracketScreen>
    </>
  )
}
