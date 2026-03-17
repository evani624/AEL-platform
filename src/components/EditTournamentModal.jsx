import { useState, useEffect } from 'react'
import Modal from './Modal'

const MODAL_WIDTH = 448

const INPUT_STYLE = {
  background: 'rgba(20, 23, 33, 0.6)',
  borderColor: 'rgba(0, 245, 255, 0.3)',
}

export default function EditTournamentModal({ isOpen, onClose, tournament, onSave }) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (tournament) setName(tournament.name)
  }, [tournament, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !tournament) return
    onSave?.({ id: tournament.id, name: trimmed })
    onClose?.()
  }

  const handleCancel = () => {
    setName(tournament?.name ?? '')
    onClose?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Tournament" width={MODAL_WIDTH}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="edit-tournament-name" className="mb-2 block text-sm font-medium text-ice-white/90">
            Tournament Name
          </label>
          <input
            id="edit-tournament-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter tournament name"
            className="w-full rounded-lg border px-4 py-3 text-ice-white placeholder:text-ice-white/40 focus:border-electric-cyan focus:outline-none focus:ring-1 focus:ring-electric-cyan"
            style={INPUT_STYLE}
            autoFocus
          />
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
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
