/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        bourdeaux: {
          DEFAULT: '#7d0022',
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d2da',
          300: '#f4aebb',
          400: '#ec7d96',
          500: '#df5073',
          600: '#cb305a',
          700: '#ab2349',
          800: '#8f2042',
          900: '#7d0022',
          950: '#450c1d',
        },
      },
      fontFamily: {
        cursive: ['Dancing Script', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 1s ease-out forwards',
        bounceLight: 'bounceSubtle 0.8s ease-in-out',
        reveal: 'reveal 0.5s ease-out',
      },
    },
  },
  plugins: [],
};
