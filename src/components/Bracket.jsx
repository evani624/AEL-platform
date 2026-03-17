import { useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import MatchCard from './MatchCard'

const ROW_HEIGHT = 88
const MATCH_WIDTH = 192

export default function Bracket({ tournament, onSlotClick, onDeleteTeam, lastRoundIndex, isReadOnly }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.5))
  }, [])

  const handleResetView = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale((s) => Math.min(Math.max(s + delta, 0.5), 2))
    }
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0 && !e.target.closest('[data-match-card]')) {
      setIsPanning(true)
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }
  }, [position])

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      })
    }
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  if (!tournament?.rounds?.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-ice-white/60">
        <p>Select or create a tournament to view the bracket</p>
      </div>
    )
  }

  const teamSize = Number(tournament?.teamSize) || 16
  const totalRows = Math.max(1, Math.floor(teamSize / 2))
  const roundsLength = tournament?.rounds?.length ?? 1
  const safeRoundsLength = Math.max(1, Number(roundsLength) || 1)

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 flex-col overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      {/* Zoom controls - Figma: fixed bottom 32px right 32px, 40x40 buttons, 8px radius */}
      <div
        className="absolute right-8 bottom-8 z-10 flex gap-1 rounded-lg"
        style={{
          background: 'rgba(31, 38, 51, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 245, 255, 0.3)',
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-electric-cyan/20"
          style={{ color: '#00F5FF' }}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-electric-cyan/20"
          style={{ color: '#00F5FF' }}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-electric-cyan/20"
          style={{ color: '#00F5FF' }}
          aria-label="Reset view"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable bracket - horizontal scroll + zoom/pan */}
      <div className="flex-1 overflow-auto p-8">
        {/* Tournament Canvas: single unified wrapper for zoom/pan - titles + matches move as one */}
        <div
          className="inline-block min-w-max cursor-grab"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transformOrigin: '0 0',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          <div
            className="grid gap-x-12"
            style={{
              gridTemplateRows: `auto repeat(${totalRows}, ${ROW_HEIGHT}px)`,
              gridTemplateColumns: `repeat(${safeRoundsLength}, ${MATCH_WIDTH}px)`,
              width: 'fit-content',
            }}
          >
            {(tournament.rounds ?? []).map((round, roundIndex) => (
                <div key={round?.name ?? `r-${roundIndex}`} className="contents">
                {/* Round header - part of same canvas */}
                <div
                  className="flex items-center justify-center pb-2"
                  style={{
                    gridColumn: roundIndex + 1,
                    gridRow: 1,
                  }}
                >
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgba(240, 245, 249, 0.7)', fontWeight: 600 }}
                  >
                    {round.name}
                  </h3>
                </div>
                {(round?.matches ?? []).map((match, matchIndex) => {
                  if (!match) return null
                  const rowSpan = Math.pow(2, roundIndex)
                  const rowStart = matchIndex * rowSpan + 2
                  const rowEnd = rowStart + rowSpan

                  return (
                    <div
                      key={match?.id ?? `m-${roundIndex}-${matchIndex}`}
                      className="flex items-center"
                      style={{
                        gridColumn: roundIndex + 1,
                        gridRow: `${rowStart} / ${rowEnd}`,
                      }}
                    >
                      <MatchCard
                        match={match}
                        onSlotClick={isReadOnly ? undefined : onSlotClick}
                        onDeleteTeam={isReadOnly ? undefined : onDeleteTeam}
                        isClickable={!isReadOnly}
                        readOnly={isReadOnly}
                        isFinal={roundIndex === (lastRoundIndex >= 0 ? lastRoundIndex : Math.max(0, (tournament?.rounds?.length ?? 1) - 1))}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
