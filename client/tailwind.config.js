/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mystic: {
          bg: '#0a0a1a',
          card: '#1a1a2e',
          gold: '#c9a84c',
          text: '#e8e0d0',
          accent: '#6b5b8d',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Noto Serif SC', 'serif'],
      },
    },
  },
  plugins: [],
}
