import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme.js';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter var"', ...defaultTheme.fontFamily.sans],
        mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
};

export default config;
