import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* Figma Add Team / Match Result modal specs - Glassmorphism */
const MODAL_STYLE = {
  background: 'linear-gradient(135deg, rgba(31, 38, 51, 0.98), rgba(42, 49, 66, 0.98))',
  backdropFilter: 'blur(30px)',
  WebkitBackdropFilter: 'blur(30px)',
  border: '2px solid rgba(0, 245, 255, 0.4)',
  boxShadow: '0 8px 32px rgba(0, 245, 255, 0.4), 0 0 60px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '20px',
}

const BACKDROP_STYLE = {
  backdropFilter: 'blur(15px)',
  WebkitBackdropFilter: 'blur(15px)',
  backgroundColor: 'rgba(11, 14, 20, 0.8)',
}

export default function Modal({ isOpen, onClose, children, title, width = 448 }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={BACKDROP_STYLE}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative"
            style={{ ...MODAL_STYLE, width: Math.min(width, '100%'), maxWidth: 448 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <h2 className="mb-4 text-lg" style={{ color: '#F0F5F9', fontWeight: 600 }}>{title}</h2>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
