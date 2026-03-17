import { useState } from 'react'
import Modal from './Modal'

const MODAL_WIDTH = 448

export default function MatchResultModal({ isOpen, onClose, match, onConfirm }) {
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')

  const team1 = match?.team1
  const team2 = match?.team2

  const handleSubmit = (e) => {
    e.preventDefault()
    const s1 = parseInt(score1, 10)
    const s2 = parseInt(score2, 10)
    if (isNaN(s1) || isNaN(s2) || s1 === s2) return
    const winnerId = s1 > s2 ? team1?.id : team2?.id
    onConfirm?.({ winnerId })
    setScore1('')
    setScore2('')
    onClose?.()
  }

  const handleCancel = () => {
    setScore1('')
    setScore2('')
    onClose?.()
  }

  const getTeamColor = (team) => team?.color || '#00F5FF'

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Match Result" width={MODAL_WIDTH}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-3">
          <div
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{
              background: 'rgba(20, 23, 33, 0.6)',
              borderColor: 'rgba(0, 245, 255, 0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getTeamColor(team1) }}
              />
              <span className="font-medium text-ice-white">{team1?.name || 'TBD'}</span>
            </div>
            <input
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              placeholder="0"
              className="w-16 rounded border px-2 py-1.5 text-center text-ice-white focus:border-electric-cyan focus:outline-none"
              style={{
                background: 'rgba(31, 38, 51, 0.8)',
                borderColor: 'rgba(0, 245, 255, 0.3)',
              }}
            />
          </div>
          <div
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{
              background: 'rgba(20, 23, 33, 0.6)',
              borderColor: 'rgba(0, 245, 255, 0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getTeamColor(team2) }}
              />
              <span className="font-medium text-ice-white">{team2?.name || 'TBD'}</span>
            </div>
            <input
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              placeholder="0"
              className="w-16 rounded border px-2 py-1.5 text-center text-ice-white focus:border-electric-cyan focus:outline-none"
              style={{
                background: 'rgba(31, 38, 51, 0.8)',
                borderColor: 'rgba(0, 245, 255, 0.3)',
              }}
            />
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
            disabled={
              score1 === '' ||
              score2 === '' ||
              parseInt(score1, 10) === parseInt(score2, 10) ||
              isNaN(parseInt(score1, 10)) ||
              isNaN(parseInt(score2, 10))
            }
            className="min-h-[56px] flex-1 rounded-lg px-5 py-4 text-base font-semibold transition-all disabled:opacity-50 hover:shadow-[0_0_30px_rgba(0,245,255,0.5)]"
            style={{
              background: 'rgba(0, 245, 255, 0.2)',
              color: '#00F5FF',
              border: '1px solid rgba(0, 245, 255, 0.5)',
              boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)',
            }}
          >
            Confirm Result
          </button>
        </div>
      </form>
    </Modal>
  )
}
