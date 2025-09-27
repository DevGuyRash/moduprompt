import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme.js';

const withOpacityValue = (variable: string) => ({ opacityValue }: { opacityValue?: string }) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}))`;
  }
  return `rgb(var(${variable}) / ${opacityValue})`;
};

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
      colors: {
        surface: withOpacityValue('--mp-color-surface-rgb'),
        'surface-subtle': withOpacityValue('--mp-color-surface-subtle-rgb'),
        'surface-strong': withOpacityValue('--mp-color-surface-strong-rgb'),
        'surface-emphasis': withOpacityValue('--mp-color-surface-emphasis-rgb'),
        foreground: withOpacityValue('--mp-color-text-primary-rgb'),
        'foreground-muted': withOpacityValue('--mp-color-text-secondary-rgb'),
        border: withOpacityValue('--mp-color-border-rgb'),
        brand: withOpacityValue('--mp-color-brand-rgb'),
        'brand-strong': withOpacityValue('--mp-color-brand-strong-rgb'),
        danger: withOpacityValue('--mp-color-danger-rgb'),
        warning: withOpacityValue('--mp-color-warning-rgb'),
        success: withOpacityValue('--mp-color-success-rgb'),
      },
    },
  },
  plugins: [],
};

export default config;
