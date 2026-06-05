import { colorHex } from '../constants/teamColors'
import { CrownSVG } from './ChampionCard'

/**
 * Gold crowning moment for the leaderboard champion. Reuses every
 * .champion / .champion__crown / .champion__card style from ChampionCard.
 * Shows only crown + "Champion" label + team chip + name — matching the
 * bracket champion card. No score / no points line.
 */
export default function LeaderboardChampionCard({ team }) {
  if (!team) return null
  return (
    <div className="champion" key={team.name /* remount on team change */}>
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
      </div>
    </div>
  )
}
