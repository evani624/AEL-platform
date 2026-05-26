import { useState } from 'react'
import { Link2, Copy, Check } from 'lucide-react'
import Modal from './Modal'

export default function ShareLinkModal({ isOpen, tournament, onClose, onCopied }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !tournament) return null

  const url = `${window.location.origin}/view/${tournament.id}`
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    onCopied?.()
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      accent="Public read-only link"
      title="Share this tournament"
      width={460}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Close
          </button>
          <button className="btn btn--primary btn--sm" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 6 }}>
        <label className="field__label">Public URL</label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 13px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--f-mono)',
            fontSize: 12.5,
            color: 'var(--violet-ice)',
          }}
        >
          <Link2 size={14} style={{ flexShrink: 0, color: 'var(--text-mute)' }} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {url}
          </span>
        </div>
        <div className="field__hint">Anyone with this link can view the bracket. No sign-in required.</div>
      </div>
    </Modal>
  )
}
