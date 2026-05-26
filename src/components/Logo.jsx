// ARENA ELEAGUE — violet gamepad + bolt mark (from the redesign)
export default function Logo({ withText = true, size, className = '' }) {
  const cls = `brand ${size === 'lg' ? 'brand--lg' : size === 'xl' ? 'brand--xl' : ''} ${className}`.trim()
  return (
    <span className={cls}>
      <span className="brand__mark">
        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="ARENA ELEAGUE">
          <defs>
            <linearGradient id="lg-pad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <linearGradient id="lg-bolt" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F0F5F9" />
              <stop offset="100%" stopColor="#C4B5FD" />
            </linearGradient>
            <filter id="lg-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Gamepad silhouette */}
          <path
            fill="url(#lg-pad)"
            d="M14 14h20a8 8 0 0 1 7.9 6.6l1.8 10A8 8 0 0 1 35.8 40c-2.2 0-4.2-1-5.6-2.6L28 35h-8l-2.2 2.4A7.6 7.6 0 0 1 12.2 40 8 8 0 0 1 4.3 30.6l1.8-10A8 8 0 0 1 14 14z"
            opacity="0.96"
          />
          {/* Inset bevel */}
          <path
            fill="none"
            stroke="#C4B5FD"
            strokeOpacity="0.55"
            strokeWidth="0.8"
            d="M14 14h20a8 8 0 0 1 7.9 6.6l1.8 10A8 8 0 0 1 35.8 40c-2.2 0-4.2-1-5.6-2.6L28 35h-8l-2.2 2.4A7.6 7.6 0 0 1 12.2 40 8 8 0 0 1 4.3 30.6l1.8-10A8 8 0 0 1 14 14z"
          />
          {/* Right buttons */}
          <circle cx="33.5" cy="23.5" r="2" fill="#0A0918" opacity="0.65" />
          <circle cx="37.5" cy="27" r="2" fill="#0A0918" opacity="0.65" />
          <circle cx="29.5" cy="27" r="2" fill="#0A0918" opacity="0.65" />
          <circle cx="33.5" cy="30.5" r="2" fill="#0A0918" opacity="0.65" />
          {/* D-pad slot (left) */}
          <rect x="10" y="22" width="9" height="2.6" rx="1.3" fill="#0A0918" opacity="0.7" />
          <rect x="13.2" y="18.7" width="2.6" height="9" rx="1.3" fill="#0A0918" opacity="0.7" />
          {/* Lightning bolt cutout */}
          <path
            fill="url(#lg-bolt)"
            filter="url(#lg-glow)"
            d="M25.6 5.5l-7.4 13.2a.7.7 0 0 0 .65 1.05h4.6L21 30.2a.55.55 0 0 0 .98.4l9.1-12.9a.7.7 0 0 0-.6-1.1h-4.55l2.6-10.5a.55.55 0 0 0-.98-.42z"
          />
          <path
            fill="none"
            stroke="#0A0918"
            strokeWidth="0.6"
            strokeOpacity="0.4"
            d="M25.6 5.5l-7.4 13.2a.7.7 0 0 0 .65 1.05h4.6L21 30.2a.55.55 0 0 0 .98.4l9.1-12.9a.7.7 0 0 0-.6-1.1h-4.55l2.6-10.5a.55.55 0 0 0-.98-.42z"
          />
        </svg>
      </span>
      {withText && <span className="brand__name">ARENA ELEAGUE</span>}
    </span>
  )
}
