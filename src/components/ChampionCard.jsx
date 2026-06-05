import { colorHex } from '../constants/teamColors'

export function CrownSVG() {
  return (
    <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" aria-label="Champion crown">
      <defs>
        <linearGradient id="crown-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE8A3" />
          <stop offset="42%" stopColor="#F5C24A" />
          <stop offset="100%" stopColor="#B47A0A" />
        </linearGradient>
        <linearGradient id="crown-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE8A3" />
          <stop offset="50%" stopColor="#F5C24A" />
          <stop offset="100%" stopColor="#8A5A05" />
        </linearGradient>
        <radialGradient id="crown-gem-center" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#E9D5FF" />
          <stop offset="60%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4C1D95" />
        </radialGradient>
        <radialGradient id="crown-gem-side" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF8D6" />
          <stop offset="100%" stopColor="#B47A0A" />
        </radialGradient>
      </defs>
      <path
        d="M6 40 L18 18 L26 32 L40 6 L54 32 L62 18 L74 40 Z"
        fill="url(#crown-body)"
        stroke="#7C5005"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path
        d="M6 40 L18 18 L26 32 L40 6 L54 32 L62 18 L74 40"
        fill="none"
        stroke="rgba(255, 248, 214, 0.6)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <rect x="5" y="40" width="70" height="13" rx="2.5" fill="url(#crown-band)" stroke="#7C5005" strokeWidth="0.6" />
      <rect x="6" y="41" width="68" height="2" rx="1" fill="rgba(255, 248, 214, 0.55)" />
      <circle cx="40" cy="9" r="3.5" fill="url(#crown-gem-center)" />
      <circle cx="40" cy="8.2" r="1.2" fill="rgba(255,255,255,0.85)" />
      <circle cx="18" cy="20" r="2.2" fill="url(#crown-gem-side)" />
      <circle cx="62" cy="20" r="2.2" fill="url(#crown-gem-side)" />
      <circle cx="14" cy="46.5" r="1.7" fill="rgba(255, 248, 214, 0.95)" />
      <circle cx="40" cy="46.5" r="2.2" fill="rgba(255, 248, 214, 0.95)" />
      <circle cx="66" cy="46.5" r="1.7" fill="rgba(255, 248, 214, 0.95)" />
    </svg>
  )
}

/**
 * Gold crowning moment shown above the grand final's winner. The only place
 * gold is used in the whole app.
 */
export default function ChampionCard({ team, scoreA, scoreB, winner }) {
  if (!team) return null
  const winScore = winner === 'A' ? scoreA : scoreB
  const loseScore = winner === 'A' ? scoreB : scoreA
  return (
    <div className="champion" key={team.name /* remount → replay entrance on team change */}>
      <div className="champion__crown" aria-hidden="true">
        <div className="champion__crown-aura" />
        <CrownSVG />
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={`s${i}`} className="sparkle" />
        ))}
        <span className="twinkle" />
        <span className="twinkle" />
        <span className="twinkle" />
        <span className="twinkle" />
      </div>
      <div className="champion__card">
        <div className="champion__label">Champion</div>
        <div className="champion__team">
          <span className="team-chip" style={{ '--c': colorHex(team.color) }} />
          <span className="champion__name">{team.name}</span>
        </div>
        <div className="champion__score">
          <span className="champion__score-win">{winScore ?? '—'}</span>
          <span className="champion__score-dash">—</span>
          <span className="champion__score-lose">{loseScore ?? '—'}</span>
        </div>
      </div>
    </div>
  )
}
