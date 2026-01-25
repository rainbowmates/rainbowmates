/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: '#FFFFFF',
        foreground: '#41063F',
        primary: {
          DEFAULT: '#E989EA',
          foreground: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#F0F9FF',
          foreground: '#41063F'
        },
        accent: {
          DEFAULT: '#FFF9C4',
          foreground: '#41063F'
        },
        muted: {
          DEFAULT: '#F3E5F5',
          foreground: '#8E24AA'
        },
        border: '#E1BEE7',
        'neon-pink': '#E989EA',
        'dark-purple': '#41063F',
        'soft-blue': '#E3F2FD',
        'soft-yellow': '#FFF9C4'
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};