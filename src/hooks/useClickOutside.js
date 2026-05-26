import { useEffect } from 'react'

/**
 * Calls `cb` when a mousedown lands outside the element referenced by `ref`.
 */
export default function useClickOutside(ref, cb) {
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) cb(e)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [ref, cb])
}
