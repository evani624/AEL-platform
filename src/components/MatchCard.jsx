import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { TEAM_COLOR_PRESETS } from '../constants/colors'

/* Figma Match Card specs exact - use fallbacks to prevent NaN */
const CARD_WIDTH = 192
const CARD_BASE = {
  width: `${CARD_WIDTH || 192}px`,
  minHeight: '72px',
  borderRadius: '8px',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, rgba(31, 38, 51, 0.7), rgba(42, 49, 66, 0.5))',
  border: '1px solid rgba(0, 245, 255, 0.2)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
}

const CARD_HOVER = {
  boxShadow: '0 0 20px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(0, 245, 255, 0.4)',
}

const SLOT_WINNER = {
  boxShadow: '0 0 25px rgba(0, 245, 255, 0.6), inset 0 0 20px rgba(0, 245, 255, 0.1)',
  borderColor: 'rgba(0, 245, 255, 0.5)',
}

/** Silver glow for Final match winner - prominent against dark background */
const CHAMPION_GLOW = {
  boxShadow: '0 0 30px rgba(200,200,200,0.6), inset 0 0 12px rgba(255,255,255,0.08)',
  border: '3px solid rgb(163, 163, 163)',
  zIndex: 100,
}

const getTeamColor = (team) => {
  if (!team?.color) return TEAM_COLOR_PRESETS[0]
  if (typeof team.color === 'string') return team.color
  const idx = (team.color ?? 0) % (TEAM_COLOR_PRESETS?.length ?? 1)
  return TEAM_COLOR_PRESETS[Number.isNaN(idx) ? 0 : idx] ?? TEAM_COLOR_PRESETS[0]
}

export default function MatchCard({ match, onSlotClick, onDeleteTeam, isClickable, isFinal, readOnly }) {
  const { team1, team2, winnerId } = match
  const hasBothTeams = team1 && team2
  const isFinalMatch = Boolean(isFinal)
  const isWinner1 = team1?.id === winnerId
  const isWinner2 = team2?.id === winnerId
  const showChampionGlow1 = isFinalMatch && isWinner1
  const showChampionGlow2 = isFinalMatch && isWinner2

  if (isFinalMatch && winnerId) {
    console.log('Final Match Winner:', winnerId, { isWinner1, isWinner2 })
  }

  const handleSlotClick = (slot, e) => {
    if (!isClickable) return
    if (e?.target?.closest('[data-delete-team]')) return
    const team = slot === 'team1' ? team1 : team2
    if (team && hasBothTeams) {
      onSlotClick?.(match, null)
    } else if (!team) {
      onSlotClick?.(match, slot)
    }
  }

  const handleDeleteTeam = (slot, e) => {
    e.stopPropagation()
    const team = slot === 'team1' ? team1 : team2
    if (team) onDeleteTeam?.(match, slot)
  }

  const hasChampion = showChampionGlow1 || showChampionGlow2

  return (
    <motion.div
      data-match-card
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group ${isClickable ? 'cursor-pointer' : ''}`}
      style={{
        ...CARD_BASE,
        ...(hasChampion && { overflow: 'visible' }),
        ...(!hasBothTeams && { boxShadow: '0 0 40px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.2)' }),
      }}
      whileHover={isClickable ? CARD_HOVER : {}}
    >
      {/* Team 1 slot - outermost div of winning team's slot gets silver champion glow */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => handleSlotClick('team1', e)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSlotClick('team1')}
        className="group/slot relative flex cursor-pointer flex-col border-b px-3 py-2.5 transition-colors hover:bg-electric-cyan/5"
        style={{
          borderColor: showChampionGlow1 ? undefined : 'rgba(0, 245, 255, 0.15)',
          minHeight: 36,
          ...(showChampionGlow1 ? CHAMPION_GLOW : (isWinner1 || team1?.isWinningPath) ? SLOT_WINNER : {}),
        }}
      >
        {team1 ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getTeamColor(team1) }}
            />
            <span className="min-w-0 flex-1 truncate text-base font-medium" style={{ color: '#F0F5FF' }}>
              {team1.name}
            </span>
            {!readOnly && (
              <button
                type="button"
                data-delete-team
                onClick={(e) => handleDeleteTeam('team1', e)}
                className="shrink-0 rounded p-0.5 text-ice-white/40 opacity-50 transition-opacity transition-colors hover:bg-red-500/30 hover:text-red-400 max-md:opacity-70 md:opacity-0 md:group-hover/slot:opacity-100"
                aria-label={`Remove ${team1.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-ice-white/40">TBD</span>
        )}
      </div>

      {/* Team 2 slot - outermost div of winning team's slot gets silver champion glow */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => handleSlotClick('team2', e)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSlotClick('team2')}
        className="group/slot relative flex cursor-pointer flex-col px-3 py-2.5 transition-colors hover:bg-electric-cyan/5"
        style={{
          minHeight: 36,
          ...(showChampionGlow2 ? CHAMPION_GLOW : (isWinner2 || team2?.isWinningPath) ? SLOT_WINNER : {}),
        }}
      >
        {team2 ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getTeamColor(team2) }}
            />
            <span className="min-w-0 flex-1 truncate text-base font-medium" style={{ color: '#F0F5FF' }}>
              {team2.name}
            </span>
            {!readOnly && (
              <button
                type="button"
                data-delete-team
                onClick={(e) => handleDeleteTeam('team2', e)}
                className="shrink-0 rounded p-0.5 text-ice-white/40 opacity-50 transition-opacity transition-colors hover:bg-red-500/30 hover:text-red-400 max-md:opacity-70 md:opacity-0 md:group-hover/slot:opacity-100"
                aria-label={`Remove ${team2.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-ice-white/40">TBD</span>
        )}
      </div>
    </motion.div>
  )
}
