import { useEffect } from 'react'

/**
 * Click-and-drag panning on a scroll container (ported from the Arena Eleague design).
 *
 *   axis:           'x' | 'y' | 'xy' (default 'xy')
 *   ignoreSelector: drag is NOT initiated if mousedown lands on a node matching
 *                   this selector (e.g. match cards stay clickable)
 *   threshold:      pixels of movement before we treat it as a drag (default 4)
 *
 * Scroll writes are coalesced to one per animation frame, and a global
 * `is-dragging-global` class is toggled on <html> so the ambient background can
 * pause while the user is actively dragging.
 */
export default function useDragScroll(ref, { axis = 'xy', ignoreSelector, threshold = 4 } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let active = false
    let dragging = false
    let startX = 0, startY = 0
    let scrollLeft = 0, scrollTop = 0
    let pointerId = null
    let pendingDx = 0, pendingDy = 0
    let rafId = 0

    function applyScroll() {
      rafId = 0
      if (axis === 'x' || axis === 'xy') el.scrollLeft = scrollLeft - pendingDx
      if (axis === 'y' || axis === 'xy') el.scrollTop = scrollTop - pendingDy
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return
      if (ignoreSelector && e.target.closest && e.target.closest(ignoreSelector)) return
      const tag = (e.target.tagName || '').toLowerCase()
      if (['input', 'textarea', 'select', 'button', 'a'].includes(tag)) return
      if (e.target.closest && e.target.closest('input,textarea,select,button,a')) return

      active = true
      dragging = false
      startX = e.clientX
      startY = e.clientY
      scrollLeft = el.scrollLeft
      scrollTop = el.scrollTop
      pointerId = e.pointerId
    }

    function onPointerMove(e) {
      if (!active) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!dragging) {
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return
        dragging = true
        el.classList.add('is-dragging')
        document.documentElement.classList.add('is-dragging-global')
        try { el.setPointerCapture(pointerId) } catch { /* noop */ }
      }
      // Coalesce: store latest delta, apply at most once per frame.
      pendingDx = dx
      pendingDy = dy
      if (!rafId) rafId = requestAnimationFrame(applyScroll)
      e.preventDefault()
    }

    function endDrag() {
      if (!active) return
      const wasDragging = dragging
      active = false
      dragging = false
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      el.classList.remove('is-dragging')
      document.documentElement.classList.remove('is-dragging-global')
      try { if (pointerId != null) el.releasePointerCapture(pointerId) } catch { /* noop */ }
      pointerId = null
      // Swallow the click that would fire after a real drag
      if (wasDragging) {
        const swallow = (ev) => {
          ev.stopPropagation()
          ev.preventDefault()
          window.removeEventListener('click', swallow, true)
        }
        window.addEventListener('click', swallow, true)
        setTimeout(() => window.removeEventListener('click', swallow, true), 0)
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('pointerleave', endDrag)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.documentElement.classList.remove('is-dragging-global')
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('pointerleave', endDrag)
    }
  }, [ref, axis, ignoreSelector, threshold])
}
