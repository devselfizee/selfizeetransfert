import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C3FC5',
          light: '#8B5CF6',
          dark: '#5629A6',
          50: '#F5F0FF',
          100: '#EDE5FF',
          200: '#D4C4F7',
          500: '#8B5CF6',
          600: '#6C3FC5',
          700: '#5629A6',
          800: '#3F1D7A',
          900: '#1a1a2e',
        },
        dark: '#1a1a2e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
