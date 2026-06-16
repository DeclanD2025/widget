/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          dark: '#052e16',
          DEFAULT: '#15803d',
          light: '#22c55e',
          line: 'rgba(255,255,255,0.12)',
        },
        baller: {
          gold: '#fbbf24',
          ink: '#0a0f0a',
        },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -8px rgba(0,0,0,0.45)',
        glow: '0 0 24px rgba(34,197,94,0.55)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        pop: 'pop 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
