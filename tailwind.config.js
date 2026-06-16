/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep stadium-night base
        base: {
          900: '#070b09',
          800: '#0b110e',
          700: '#111814',
        },
        // Glass surfaces use white/black alpha in classes; these are accents.
        emerald: {
          glow: '#1fd17a',
        },
        gold: {
          DEFAULT: '#f4c95d',
          deep: '#caa23f',
        },
        ink: '#04070500',
      },
      fontFamily: {
        display: ['"Saira Condensed"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        display: '0.01em',
      },
      boxShadow: {
        card: '0 18px 40px -20px rgba(0,0,0,0.8)',
        gold: '0 0 0 1px rgba(244,201,93,0.35), 0 10px 30px -10px rgba(244,201,93,0.25)',
        emerald: '0 0 0 1px rgba(31,209,122,0.35), 0 12px 30px -12px rgba(31,209,122,0.35)',
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(135deg, #f8d97a 0%, #f4c95d 45%, #c89a36 100%)',
        'card-grad': 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
      },
    },
  },
  plugins: [],
}
