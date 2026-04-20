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
          DEFAULT: '#fe0154',
          light: '#ff4d85',
          dark: '#c60140',
          50: '#fff1f5',
          100: '#ffdbe6',
          200: '#ffb8cd',
          500: '#fe0154',
          600: '#c60140',
          700: '#9a012f',
          800: '#700123',
          900: '#4a0017',
        },
        accent: {
          DEFAULT: '#fe0154',
          light: '#ff4d85',
          dark: '#c60140',
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
