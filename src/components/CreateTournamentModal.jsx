import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import Modal from './Modal'
import { BRACKET_SIZE_OPTIONS } from '../constants/games'

const MODAL_WIDTH = 448

const INPUT_STYLE = {
  background: 'rgba(20, 23, 33, 0.6)',
  borderColor: 'rgba(0, 245, 255, 0.3)',
}

const DROPDOWN_BASE = {
  background: 'rgba(20, 23, 33, 0.6)',
  borderColor: 'rgba(0, 245, 255, 0.3)',
}

const DROPDOWN_ACTIVE = {
  borderColor: 'rgba(0, 245, 255, 0.5)',
  boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)',
}

export default function CreateTournamentModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [game, setGame] = useState('')
  const [bracketSize, setBracketSize] = useState(16)
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false)
  const sizeDropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target)) {
        setSizeDropdownOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate?.({ name: trimmed, game: game.trim(), teamSize: bracketSize })
    setName('')
    setGame('')
    setBracketSize(16)
    setSizeDropdownOpen(false)
    onClose?.()
  }

  const handleCancel = () => {
    setName('')
    setGame('')
    setBracketSize(16)
    setSizeDropdownOpen(false)
    onClose?.()
  }

  const selectedSizeLabel = BRACKET_SIZE_OPTIONS.find((o) => o.value === bracketSize)?.label ?? '16 Teams'

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Create Tournament" width={MODAL_WIDTH}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="tournament-name" className="mb-2 block text-sm font-medium text-ice-white/90">
            Tournament Name
          </label>
          <input
            id="tournament-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter tournament name"
            className="w-full rounded-lg border px-4 py-3 text-ice-white placeholder:text-ice-white/40 focus:border-electric-cyan focus:outline-none focus:ring-1 focus:ring-electric-cyan"
            style={INPUT_STYLE}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="game-name" className="mb-2 block text-sm font-medium text-ice-white/90">
            Game
          </label>
          <input
            id="game-name"
            type="text"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="Enter game name"
            className="w-full rounded-lg border px-4 py-3 text-ice-white placeholder:text-ice-white/40 focus:border-electric-cyan focus:outline-none focus:ring-1 focus:ring-electric-cyan"
            style={INPUT_STYLE}
          />
        </div>

        <div ref={sizeDropdownRef}>
          <label className="mb-2 block text-sm font-medium text-ice-white/90">
            Bracket Size
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSizeDropdownOpen(!sizeDropdownOpen)
              }}
              className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-ice-white transition-all"
              style={{ ...DROPDOWN_BASE, ...(sizeDropdownOpen ? DROPDOWN_ACTIVE : {}) }}
            >
              <span>{selectedSizeLabel}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-electric-cyan transition-transform ${sizeDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {sizeDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border py-1"
                style={{
                  background: 'rgba(31, 38, 51, 0.98)',
                  borderColor: 'rgba(0, 245, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 245, 255, 0.2)',
                }}
              >
                {BRACKET_SIZE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setBracketSize(value)
                      setSizeDropdownOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-ice-white transition-colors hover:bg-[rgba(0,245,255,0.15)]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-lg px-4 py-3 font-medium transition-colors"
            style={{
              background: 'transparent',
              color: 'rgba(240, 245, 249, 0.9)',
              border: '1px solid rgba(0, 245, 255, 0.3)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="min-h-[56px] flex-1 rounded-lg px-5 py-4 text-base font-semibold transition-all disabled:opacity-50 hover:shadow-[0_0_30px_rgba(0,245,255,0.5)]"
            style={{
              background: 'rgba(0, 245, 255, 0.2)',
              color: '#00F5FF',
              border: '1px solid rgba(0, 245, 255, 0.5)',
              boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)',
            }}
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  )
}
