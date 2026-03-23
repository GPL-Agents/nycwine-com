/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#E8007D',
          light: '#fff0f8',
          dark: '#b5005f',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
