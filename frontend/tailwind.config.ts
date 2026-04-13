import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B2A4A',
          light: '#2A3F6B',
          dark: '#0D1B2A',
        },
        secondary: {
          DEFAULT: '#8C1D40',
          light: '#A62B55',
          dark: '#6B1530',
        },
        accent: {
          DEFAULT: '#C9A84C',
          light: '#D4B86A',
          dark: '#B09035',
        },
        surface: {
          DEFAULT: '#F5F5F5',
          dark: '#E8E8E8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
