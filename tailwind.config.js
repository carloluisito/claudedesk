/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/ui/app/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
  darkMode: 'class',
  safelist: [
    'bg-accent',
    'bg-accent-hover',
    'text-accent',
    'border-accent',
    'hover:bg-accent-hover',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        // Using Tailwind's zinc palette as base (matches mockups)
        // Dynamic accent color from CSS variables (full rgb() strings)
        accent: {
          DEFAULT: 'var(--accent-color)',
          hover: 'var(--accent-color-hover)',
        },
      },
      boxShadow: {
        'glow-blue': '0 16px 60px rgba(59,130,246,0.25)',
        'glow-green': '0 16px 60px rgba(16,185,129,0.22)',
        'glow-red': '0 16px 60px rgba(239,68,68,0.22)',
        // Orb-specific glows
        'orb-glow-blue': '0 0 60px 20px rgba(59,130,246,0.3), 0 0 100px 40px rgba(59,130,246,0.15)',
        'orb-glow-blue-intense': '0 0 80px 30px rgba(96,165,250,0.4), 0 0 120px 50px rgba(96,165,250,0.2)',
        'orb-glow-violet': '0 0 60px 20px rgba(139,92,246,0.3), 0 0 100px 40px rgba(139,92,246,0.15)',
        'orb-glow-red': '0 0 60px 20px rgba(239,68,68,0.3), 0 0 100px 40px rgba(239,68,68,0.15)',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'spin-slower': 'spin 30s linear infinite',
        'spin-reverse': 'spin 25s linear infinite reverse',
        'spin-reverse-slow': 'spin 30s linear infinite reverse',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'plasma-morph': 'plasma-morph 8s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 1.5s ease-in-out infinite',
        'error-shake': 'error-shake 0.4s ease-in-out',
      },
      keyframes: {
        'plasma-morph': {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%' },
          '75%': { borderRadius: '60% 40% 60% 30% / 70% 30% 50% 60%' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'error-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
      },
    },
  },
  plugins: [],
};
