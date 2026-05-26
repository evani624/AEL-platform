import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Base modal shell (Arena Eleague redesign): blurred veil + gradient-bordered
 * card with header accent, title, close button, body and optional footer.
 */
export default function Modal({ isOpen, onClose, title, accent, footer, children, width = 460 }) {
  useEffect(() => {
    if (!isOpen) return
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-veil" onClick={onClose}>
      <div
        className="modal"
        style={width ? { maxWidth: width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h3 className="modal__title">
            {accent && <span className="accent">{accent}</span>}
            {title}
          </h3>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  )
}
