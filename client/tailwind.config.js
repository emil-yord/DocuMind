/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EDEEE6',
        paperRaised: '#F6F6F0',
        ink: '#232A2E',
        inkMuted: '#5E655F',
        line: '#D8D8CC',
        accent: '#2F6F62',
        accentSoft: 'rgba(47,111,98,0.10)',
        gold: '#B8873A',
        goldSoft: 'rgba(184,135,58,0.14)'
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
