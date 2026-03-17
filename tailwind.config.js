/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-indigo': '#141721',
        'charcoal-grey': '#2A3142',
        'electric-cyan': '#00F5FF',
        'ice-white': '#F0F5F9',
        'slate-grey': '#1F2633',
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0, 245, 255, 0.4), 0 0 40px rgba(0, 245, 255, 0.2)',
        'cyan-glow-strong': '0 0 30px rgba(0, 245, 255, 0.6), 0 0 60px rgba(0, 245, 255, 0.3)',
        'cyan-glow-navbar': '0 4px 24px rgba(0, 245, 255, 0.1)',
        'cyan-glow-button': '0 0 20px rgba(0, 245, 255, 0.3)',
        'cyan-glow-button-hover': '0 0 30px rgba(0, 245, 255, 0.5)',
      },
      dropShadow: {
        'cyan-glow': '0 0 20px rgba(0, 245, 255, 0.4)',
        'cyan-glow-strong': '0 0 30px rgba(0, 245, 255, 0.6)',
      },
    },
  },
  plugins: [],
}
