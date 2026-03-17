import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Pencil } from 'lucide-react'

const SITE_TITLE = 'ESC Committee'

export default function Navbar({ tournaments = [], selectedTournamentId, onSelectTournament, onEditTournament, onAddTournament, matchCounts = { completed: 0, upcoming: 0 } }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const selected = tournaments.find((t) => t.id === selectedTournamentId)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav
      className="flex h-16 items-center gap-6 px-6"
      style={{
        background: 'linear-gradient(135deg, rgba(20, 23, 33, 0.95), rgba(42, 49, 66, 0.95))',
        boxShadow: '0 4px 24px rgba(0, 245, 255, 0.1)',
        borderBottom: '1px solid rgba(0, 245, 255, 0.2)',
      }}
    >
      {/* Left: Site Title */}
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
        <h1 className="text-xl font-semibold text-ice-white">{SITE_TITLE}</h1>
      </div>

      {/* Center: Tournament Selector + Edit */}
      <div ref={dropdownRef} className="relative flex flex-1 max-w-md items-center gap-2">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex min-w-0 flex-1 items-center justify-between rounded-lg border px-4 py-2.5 text-left transition-colors"
          style={{
            backgroundColor: 'rgba(31, 38, 51, 0.7)',
            borderColor: dropdownOpen ? 'rgba(0, 245, 255, 0.5)' : 'rgba(0, 245, 255, 0.2)',
            color: 'rgba(240, 245, 249, 0.9)',
            boxShadow: dropdownOpen ? '0 0 20px rgba(0, 245, 255, 0.3)' : 'none',
          }}
        >
          <span className="truncate">
            {selected ? selected.name : 'Select tournament'}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-electric-cyan transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onEditTournament?.(selected)}
            className="shrink-0 rounded-lg p-2 text-ice-white/50 transition-colors hover:bg-electric-cyan/20 hover:text-electric-cyan"
            aria-label={`Edit ${selected.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        {dropdownOpen && (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border py-1"
            style={{
              backgroundColor: 'rgba(31, 38, 51, 0.98)',
              borderColor: 'rgba(0, 245, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 245, 255, 0.2)',
            }}
          >
            {tournaments.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ice-white/60">No tournaments yet</div>
            ) : (
              tournaments.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectTournament?.(t.id)
                    setDropdownOpen(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-ice-white transition-colors hover:bg-electric-cyan/10"
                >
                  {t.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Status Summary + Add Tournament Button */}
      <div className="flex items-center gap-4">
        {selectedTournamentId && (
          <div className="flex items-center gap-3 rounded-lg border px-3 py-1.5" style={{ borderColor: 'rgba(0, 245, 255, 0.2)' }}>
            <span className="text-sm text-ice-white/80">
              <span className="font-medium text-electric-cyan">{matchCounts.completed}</span>
              <span className="ml-1">Completed</span>
            </span>
            <span className="h-4 w-px bg-electric-cyan/30" />
            <span className="text-sm text-ice-white/80">
              <span className="font-medium text-electric-cyan">{matchCounts.upcoming}</span>
              <span className="ml-1">Upcoming</span>
            </span>
          </div>
        )}
        <button
        type="button"
        onClick={onAddTournament}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-all duration-200 hover:shadow-cyan-glow-button-hover"
        style={{
          backgroundColor: 'rgba(0, 245, 255, 0.15)',
          color: '#00F5FF',
          border: '1px solid rgba(0, 245, 255, 0.4)',
          boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)',
        }}
      >
        <Plus className="h-5 w-5" />
        Add Tournament
      </button>
      </div>
    </nav>
  )
}
