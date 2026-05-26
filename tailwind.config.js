/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ARENA ELEAGUE — violet-led esports palette
        bg: '#0A0918',
        'bg-deep': '#060512',
        surface: '#15122E',
        'surface-2': '#1B1738',
        'surface-3': '#221D45',
        violet: '#8B5CF6',
        'violet-soft': '#A78BFA',
        'violet-ice': '#C4B5FD',
        'violet-deep': '#5B21B6',
        cyan: '#22D3EE',
        gold: '#F5C24A',
        ice: '#F0F5F9',
        // legacy key kept so any residual `ice-white` utilities still resolve
        'ice-white': '#F0F5F9',
        'text-dim': '#A8A4C7',
        'text-mute': '#6B6790',
      },
      fontFamily: {
        display: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'violet-glow': '0 0 24px -6px rgba(139, 92, 246, 0.5)',
        'violet-glow-strong': '0 0 40px -8px rgba(139, 92, 246, 0.65)',
      },
      dropShadow: {
        'violet-glow': '0 0 12px rgba(139, 92, 246, 0.45)',
      },
    },
  },
  plugins: [],
}
