import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        base: '#050507',
        surface: 'rgba(255, 255, 255, 0.02)',
        surfaceHover: 'rgba(255, 255, 255, 0.04)',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        accent1: '#6366F1',
        accent2: '#8B5CF6',
        termRed: '#FF5F56',
        termYellow: '#FFBD2E',
        termGreen: '#27C93F',
      },
      animation: {
        'gradient-flow': 'flow 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        flow: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
