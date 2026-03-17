import { useState, useCallback } from 'react'
import { Trash2, Pencil, Share2 } from 'lucide-react'

/* Figma Sidebar specs: 320px width, rgba(31, 38, 51, 0.4), blur(10px), border */
const SIDEBAR_STYLE = {
  width: '320px',
  minWidth: '320px',
  background: 'rgba(31, 38, 51, 0.4)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRight: '1px solid rgba(0, 245, 255, 0.2)',
  height: 'calc(100vh - 4rem)',
}

export default function Sidebar({ tournaments = [], selectedTournamentId, onSelectTournament, onEditTournament, onDeleteTournament }) {
  const [copiedId, setCopiedId] = useState(null)

  const handleShareLink = useCallback((tournament) => {
    const url = `${window.location.origin}/view/${tournament.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(tournament.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])
  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden"
      style={SIDEBAR_STYLE}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(0, 245, 255, 0.2)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ice-white/80">Tournaments</h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {tournaments.length === 0 ? (
          <p className="px-3 py-4 text-sm text-ice-white/50">No tournaments</p>
        ) : (
          <ul className="space-y-1">
            {tournaments.map((t) => (
              <li key={t.id}>
                <div
                  className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                    selectedTournamentId === t.id ? 'bg-electric-cyan/15' : 'hover:bg-electric-cyan/10'
                  }`}
                  style={{
                    borderColor: selectedTournamentId === t.id ? 'rgba(0, 245, 255, 0.3)' : 'transparent',
                    borderWidth: selectedTournamentId === t.id ? 1 : 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectTournament?.(t.id)}
                    className="min-w-0 flex-1 truncate text-left text-sm text-ice-white"
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareLink(t)
                    }}
                    className={`shrink-0 rounded p-1.5 transition-colors hover:bg-electric-cyan/20 ${
                      copiedId === t.id ? 'text-electric-cyan' : 'text-ice-white/50 hover:text-electric-cyan'
                    }`}
                    aria-label={`Share ${t.name}`}
                    title="Copy share link"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditTournament?.(t)
                    }}
                    className="shrink-0 rounded p-1.5 text-ice-white/50 transition-colors hover:bg-electric-cyan/20 hover:text-electric-cyan"
                    aria-label={`Edit ${t.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteTournament?.(t.id)
                    }}
                    className="shrink-0 rounded p-1.5 text-ice-white/50 transition-colors hover:bg-red-500/20 hover:text-red-400"
                    aria-label={`Delete ${t.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  )
}
