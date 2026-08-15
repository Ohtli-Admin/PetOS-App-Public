import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F3F5F1',
        surface: '#FFFFFF',
        ink: '#24291F',
        muted: '#6B7267',
        border: '#E1E4DC',
        brand: {
          DEFAULT: '#1F4B4C',
          dark: '#153534',
        },
        accent: '#E4A335',
        success: '#3F8557',
        warning: '#E4A335',
        danger: '#C1503E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        xl: '16px',
      },
    },
  },
  plugins: [],
}

export default config
