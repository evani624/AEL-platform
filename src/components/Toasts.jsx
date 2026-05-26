import { Check, Crown, Trash2, LogOut, Play, Link2, Sparkles } from 'lucide-react'

const ICONS = {
  check: Check,
  crown: Crown,
  trash: Trash2,
  logout: LogOut,
  play: Play,
  link: Link2,
  sparkles: Sparkles,
}

export default function Toasts({ items = [] }) {
  return (
    <div className="toasts">
      {items.map((t) => {
        const Ico = ICONS[t.icon] || Check
        return (
          <div
            key={t.id}
            className={`toast ${t.flavor === 'cyan' ? 'toast--cyan' : ''} ${t.leaving ? 'toast--leaving' : ''}`}
          >
            <span className="toast__icon">
              <Ico size={12} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="toast__title">{t.title}</div>
              {t.sub && <div className="toast__sub">{t.sub}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
