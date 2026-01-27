/**
 * Design System Constants - ClaudeDesk Terminal Workspace
 * Glassmorphism-focused design tokens aligned with the mockup
 */

// Color Tokens
export const colors = {
  // Backgrounds
  bg: {
    base: '#05070c',
    glass5: 'bg-white/5',
    glass10: 'bg-white/10',
    glassDark: 'bg-black/60',
  },

  // Borders (using Tailwind ring utilities)
  border: {
    subtle: 'ring-1 ring-white/10',
    medium: 'ring-1 ring-white/15',
    focus: 'ring-2 ring-white/20',
    active: 'ring-1 ring-white',
  },

  // Text
  text: {
    primary: 'text-white',
    secondary: 'text-white/70',
    tertiary: 'text-white/55',
    muted: 'text-white/45',
    placeholder: 'text-white/35',
    // Inverted (for white backgrounds)
    invertedPrimary: 'text-black',
    invertedSecondary: 'text-black/60',
  },
} as const;

// Border Radius Tokens
export const radius = {
  xs: 'rounded-lg',      // 8px - small badges
  sm: 'rounded-xl',      // 12px - buttons, inputs
  md: 'rounded-2xl',     // 16px - cards, tabs
  lg: 'rounded-3xl',     // 24px - main panels
} as const;

// Shared Component Styles
export const glass = {
  // Card base styles
  card: `rounded-3xl bg-white/5 p-4 ring-1 ring-white/10`,
  cardHover: `rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10`,

  // Panel styles (larger containers)
  panel: `rounded-3xl bg-white/5 p-3 ring-1 ring-white/10`,

  // Button variants
  button: {
    ghost: `rounded-2xl bg-white/5 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/10 hover:text-white`,
    primary: `rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90`,
    action: `rounded-3xl bg-white/5 px-4 py-3 text-left text-white ring-1 ring-white/10 hover:bg-white/10`,
    actionPrimary: `rounded-3xl bg-white px-4 py-3 text-left text-black ring-1 ring-white hover:opacity-90`,
    small: `rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10`,
  },

  // Badge styles
  badge: `inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10`,
  badgePill: `rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60 ring-1 ring-white/10`,

  // Input styles
  input: `w-full rounded-2xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20`,

  // Tab styles
  tab: {
    inactive: `bg-white/5 text-white ring-white/10 hover:bg-white/10`,
    active: `bg-white text-black ring-white`,
  },

  // Icon wrapper
  iconBox: `rounded-xl bg-white/5 p-2 ring-1 ring-white/10`,
} as const;

// Spacing helpers
export const spacing = {
  section: 'space-y-3',
  items: 'space-y-2',
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  },
} as const;

// Layout helpers
export const layout = {
  maxWidth: 'mx-auto max-w-6xl px-6',
  grid12: 'grid gap-4 lg:grid-cols-12',
  col8: 'lg:col-span-8',
  col4: 'lg:col-span-4',
} as const;

// Animation variants (for Framer Motion)
export const animations = {
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: 0.2 },
  },
  collapse: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideIn: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: { duration: 0.2 },
  },
} as const;

// CSS class combiner (for convenience)
export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

// Tooltip text styles (for keyboard shortcuts)
export const kbdStyle = `rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60 ring-1 ring-white/10`;
