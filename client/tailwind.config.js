/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e9a8fd',
          400: '#d870f8',
          500: '#c044ef',
          600: '#a21cce',
          700: '#8617a7',
          800: '#6f1688',
          900: '#5c1870',
        },
        accent: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        dark: {
          900: '#0a0a0f',
          800: '#111118',
          700: '#1a1a27',
          600: '#22223a',
          500: '#2d2d47',
        },
      },
    },
  },
  plugins: [],
}
