/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#1a1b26',
          fg: '#a9b1d6',
          cursor: '#c0caf5',
          selection: '#33467c',
        },
      },
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Cascadia Code',
          'Consolas',
          'Monaco',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
