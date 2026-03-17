import { useState, useCallback, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import Bracket from '../components/Bracket'
import AddTeamModal from '../components/AddTeamModal'
import MatchResultModal from '../components/MatchResultModal'
import CreateTournamentModal from '../components/CreateTournamentModal'
import EditTournamentModal from '../components/EditTournamentModal'
import AppSkeleton from '../components/AppSkeleton'
import { findMatch, getMatchCounts } from '../utils/bracketUtils'
import {
  fetchTournaments,
  createTournament as createTournamentSupabase,
  updateTournament as updateTournamentSupabase,
  deleteTournament as deleteTournamentSupabase,
  upsertMatch,
  updateNextMatchWithWinner,
} from '../lib/supabaseService'

export default function AdminView() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [addTeamModal, setAddTeamModal] = useState({ open: false, match: null, slot: null })
  const [matchResultModal, setMatchResultModal] = useState({ open: false, match: null })
  const [createTournamentModalOpen, setCreateTournamentModalOpen] = useState(false)
  const [editTournamentModal, setEditTournamentModal] = useState({ open: false, tournament: null })

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId)

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
  }, [])

  const handleAddTournament = useCallback(() => {
    setCreateTournamentModalOpen(true)
  }, [])

  const handleCreateTournament = useCallback(async ({ name, game, teamSize }) => {
    try {
      const newTournament = await createTournamentSupabase({ name, game, teamSize })
      setTournaments((prev) => [...prev, newTournament])
      setSelectedTournamentId(newTournament.id)
      setCreateTournamentModalOpen(false)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const handleEditTournament = useCallback((tournament) => {
    setEditTournamentModal({ open: true, tournament })
  }, [])

  const handleSaveTournament = useCallback(async ({ id, name }) => {
    try {
      await updateTournamentSupabase(id, { name })
      setTournaments((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: name.trim() } : t))
      )
      setEditTournamentModal({ open: false, tournament: null })
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const handleDeleteTournament = useCallback(async (id) => {
    try {
      await deleteTournamentSupabase(id)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
      setSelectedTournamentId((current) => {
        if (current !== id) return current
        const remaining = tournaments.filter((t) => t.id !== id)
        return remaining.length > 0 ? remaining[0].id : null
      })
    } catch (err) {
      setError(err.message)
    }
  }, [tournaments])

  const handleSlotClick = useCallback((match, slot) => {
    if (!selectedTournamentId) return
    if (slot === null) {
      setMatchResultModal({ open: true, match })
    } else {
      setAddTeamModal({ open: true, match, slot })
    }
  }, [selectedTournamentId])

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
                matches: round.matches.map((m) =>
                  m.id === match.id ? { ...m, [slot]: team } : m
                ),
              })),
            }
          })
        )
        setAddTeamModal({ open: false, match: null, slot: null })
      } catch (err) {
        setError(err.message)
      }
    },
    [addTeamModal, selectedTournamentId]
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
        if (match.winnerId === team.id) updates.winnerId = null
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
                    if (m.winnerId === team.id) up.winnerId = null
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
    async ({ winnerId }) => {
      const { match } = matchResultModal
      if (!match || !selectedTournamentId) return

      const winner = match.team1?.id === winnerId ? match.team1 : match.team2
      if (!winner) return

      const found = findMatch(
        tournaments.find((t) => t.id === selectedTournamentId),
        match.id
      )
      if (!found) return

      const roundIndex = tournaments
        .find((t) => t.id === selectedTournamentId)
        ?.rounds?.indexOf(found.round) ?? -1
      const matchIndex = found.round.matches.indexOf(found.match)
      const isFinalMatch = !found.match.nextMatchId

      try {
        await upsertMatch(selectedTournamentId, match.id, {
          winnerId: winner.id,
        })
        if (!isFinalMatch) {
          await updateNextMatchWithWinner(
            selectedTournamentId,
            roundIndex,
            matchIndex,
            winner
          )
        }

        const winnerWithPath = { ...winner, isWinningPath: true }
        const nextSlot = matchIndex % 2 === 0 ? 'team1' : 'team2'

        setTournaments((prev) =>
          prev.map((t) => {
            if (t.id !== selectedTournamentId) return t
            return {
              ...t,
              rounds: t.rounds.map((round) => ({
                ...round,
                matches: round.matches.map((m) => {
                  if (m.id === match.id) return { ...m, winnerId: winner.id }
                  if (!isFinalMatch && found.match.nextMatchId && m.id === found.match.nextMatchId) {
                    return { ...m, [nextSlot]: winnerWithPath }
                  }
                  return m
                }),
              })),
            }
          })
        )
        setMatchResultModal({ open: false, match: null })
      } catch (err) {
        setError(err.message)
      }
    },
    [matchResultModal, selectedTournamentId, tournaments]
  )

  if (loading) return <AppSkeleton />

  return (
    <div className="flex min-h-screen flex-col">
      {error && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400"
          style={{ background: 'rgba(255, 68, 68, 0.1)' }}
        >
          {error}
        </div>
      )}

      <Navbar
        tournaments={tournaments}
        selectedTournamentId={selectedTournamentId}
        onSelectTournament={setSelectedTournamentId}
        onEditTournament={handleEditTournament}
        onAddTournament={handleAddTournament}
        matchCounts={selectedTournament ? getMatchCounts(selectedTournament) : { completed: 0, upcoming: 0 }}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          tournaments={tournaments}
          selectedTournamentId={selectedTournamentId}
          onSelectTournament={setSelectedTournamentId}
          onEditTournament={handleEditTournament}
          onDeleteTournament={handleDeleteTournament}
        />

        <main className="flex flex-1 overflow-hidden">
          <Bracket
            tournament={selectedTournament}
            onSlotClick={handleSlotClick}
            onDeleteTeam={handleDeleteTeam}
            lastRoundIndex={selectedTournament?.rounds?.length ? selectedTournament.rounds.length - 1 : -1}
          />
        </main>
      </div>

      <AddTeamModal
        isOpen={addTeamModal.open}
        onClose={() => setAddTeamModal({ open: false, match: null, slot: null })}
        onConfirm={handleAddTeamConfirm}
      />

      <MatchResultModal
        isOpen={matchResultModal.open}
        onClose={() => setMatchResultModal({ open: false, match: null })}
        match={matchResultModal.match}
        onConfirm={handleMatchResultConfirm}
      />

      <CreateTournamentModal
        isOpen={createTournamentModalOpen}
        onClose={() => setCreateTournamentModalOpen(false)}
        onCreate={handleCreateTournament}
      />

      <EditTournamentModal
        isOpen={editTournamentModal.open}
        onClose={() => setEditTournamentModal({ open: false, tournament: null })}
        tournament={editTournamentModal.tournament}
        onSave={handleSaveTournament}
      />
    </div>
  )
}
