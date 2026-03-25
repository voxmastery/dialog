import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        dialogbg: '#0A0A0F',
        dialogpanel: 'rgba(255, 255, 255, 0.02)',
        dialogborder: 'rgba(255, 255, 255, 0.06)',
        dialoghover: 'rgba(255, 255, 255, 0.04)',
        'deploy-before': '#3B82F6',
        'deploy-after': '#A855F7',
        level: {
          debug: '#8A8A96',
          info: '#FFFFFF',
          warn: '#F5B83D',
          error: '#E64553',
          fatal: '#FF2A2A',
        },
        method: {
          get: '#42D392',
          post: '#3B82F6',
          put: '#FB923C',
          del: '#EF4444',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
