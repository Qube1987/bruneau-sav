/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f3f9',
          100: '#e9e7f3',
          200: '#d6d2e9',
          300: '#b8b1d9',
          400: '#9489c5',
          500: '#7a6bb3',
          600: '#6b5aa0',
          700: '#5d4c8a',
          800: '#4e4071',
          900: '#29235C',
          950: '#1a1740',
        },
        accent: {
          50: '#fef2f5',
          100: '#fde6ec',
          200: '#fbd0dc',
          300: '#f7a8c0',
          400: '#f1759a',
          500: '#E72C63',
          600: '#d91e56',
          700: '#b71547',
          800: '#981441',
          900: '#80143d',
          950: '#4a071f',
        },
      },
    },
  },
  plugins: [],
};
