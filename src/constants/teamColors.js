// ARENA ELEAGUE team palette — teams store the hex value directly in the DB.
export const TEAM_COLORS = [
  { id: 'violet', hex: '#8B5CF6' },
  { id: 'cyan', hex: '#22D3EE' },
  { id: 'rose', hex: '#F472B6' },
  { id: 'amber', hex: '#FBBF24' },
  { id: 'emerald', hex: '#34D399' },
  { id: 'sky', hex: '#60A5FA' },
  { id: 'orange', hex: '#FB923C' },
  { id: 'lime', hex: '#A3E635' },
]

export const DEFAULT_TEAM_COLOR = TEAM_COLORS[0].hex

export function colorHex(value) {
  if (!value) return DEFAULT_TEAM_COLOR
  // already a hex string
  if (typeof value === 'string' && value.startsWith('#')) return value
  const match = TEAM_COLORS.find((c) => c.id === value)
  return match ? match.hex : DEFAULT_TEAM_COLOR
}
