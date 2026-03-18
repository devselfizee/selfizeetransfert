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
          DEFAULT: '#0693e3',
          light: '#38b6ff',
          dark: '#0570b0',
          50: '#eef8ff',
          100: '#d9f0ff',
          200: '#bbe4ff',
          500: '#0693e3',
          600: '#0570b0',
          700: '#045a8d',
          800: '#034570',
          900: '#022d4a',
        },
        accent: {
          DEFAULT: '#9b51e0',
          light: '#b47ae8',
          dark: '#7b3db3',
        },
        dark: '#313131',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
