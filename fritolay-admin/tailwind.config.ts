import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#1F2937',
        card: '#ffffff',
        border: '#E5E7EB',
        primary: {
          DEFAULT: '#E31837',
          dark: '#C0142F',
        },
        secondary: {
          DEFAULT: '#0066CC',
          dark: '#0052A3',
        },
        accent: {
          DEFAULT: '#FFC72C',
          dark: '#E6B325',
        },
        success: {
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        },
        text: {
          DEFAULT: '#1F2937',
          secondary: '#6B7280',
          light: '#9CA3AF',
        },
      },
    },
  },
  plugins: [],
}
export default config


