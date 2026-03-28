/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8eaf6',
          100: '#c5cae9',
          200: '#9fa8da',
          300: '#7986cb',
          400: '#5c6bc0',
          500: '#1a237e',
          600: '#172070',
          700: '#131c62',
          800: '#0f1754',
          900: '#0a1040',
        },
        brand: {
          navy: '#1a237e',
          purple: '#6a1b9a',
          green: '#2e7d32',
          'light-green': '#43a047',
          'soft-purple': '#9c27b0',
          'pale-navy': '#e8eaf6',
          'pale-purple': '#f3e5f5',
          'pale-green': '#e8f5e9',
        }
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['Trebuchet MS', 'Lucida Grande', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      backgroundImage: {
        'nexus-gradient': 'linear-gradient(135deg, #1a237e 0%, #6a1b9a 50%, #2e7d32 100%)',
        'card-gradient': 'linear-gradient(145deg, #ffffff 0%, #f3e5f5 100%)',
        'hero-mesh': 'radial-gradient(at 40% 20%, #e8eaf6 0px, transparent 50%), radial-gradient(at 80% 0%, #f3e5f5 0px, transparent 50%), radial-gradient(at 0% 50%, #e8f5e9 0px, transparent 50%)',
      },
      boxShadow: {
        'nexus': '0 4px 24px rgba(26, 35, 126, 0.12)',
        'nexus-hover': '0 8px 40px rgba(26, 35, 126, 0.2)',
        'card': '0 2px 16px rgba(106, 27, 154, 0.08)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.4s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
