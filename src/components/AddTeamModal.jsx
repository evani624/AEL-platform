import { useState } from 'react'
import Modal from './Modal'
import { TEAM_COLOR_PRESETS } from '../constants/colors'

const MODAL_WIDTH = 448

export default function AddTeamModal({ isOpen, onClose, onConfirm }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(TEAM_COLOR_PRESETS[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm?.({ name: trimmed, color })
    setName('')
    setColor(TEAM_COLOR_PRESETS[0])
    onClose?.()
  }

  const handleCancel = () => {
    setName('')
    setColor(TEAM_COLOR_PRESETS[0])
    onClose?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Add Participant" width={MODAL_WIDTH}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="team-name" className="mb-2 block text-sm font-medium text-ice-white/90">
            Team Name
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter team name"
            className="w-full rounded-lg border px-4 py-3 text-ice-white placeholder:text-ice-white/40 focus:border-electric-cyan focus:outline-none focus:ring-1 focus:ring-electric-cyan"
            style={{
              background: 'rgba(20, 23, 33, 0.6)',
              borderColor: 'rgba(0, 245, 255, 0.3)',
            }}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ice-white/90">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {TEAM_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-9 w-9 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  border: color === c ? '3px solid rgba(0, 245, 255, 0.9)' : '2px solid rgba(0, 245, 255, 0.3)',
                  boxShadow: color === c ? '0 0 12px rgba(0, 245, 255, 0.5)' : 'none',
                }}
                aria-label={`Select color ${c}`}
              />
            ))}
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
            Add Team
          </button>
        </div>
      </form>
    </Modal>
  )
}
