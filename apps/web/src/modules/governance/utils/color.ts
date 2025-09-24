import { DEFAULT_STATUS_COLOR, normalizeStatusColor } from '@moduprompt/snippet-store';

const FALLBACK_COLOR = DEFAULT_STATUS_COLOR;
const DARK_TEXT_HEX = '#0f172a';
const LIGHT_TEXT_HEX = '#f8fafc';
const DARK_TEXT_CSS = 'var(--color-foreground, #0f172a)';
const LIGHT_TEXT_CSS = 'var(--color-foreground-inverse, #f8fafc)';
const WCAG_AA_THRESHOLD = 4.5;

type ContrastReference = 'dark' | 'light';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface AccessiblePalette {
  background: string;
  textColorCss: string;
  textColorHex: string;
  contrastRatio: number;
  reference: ContrastReference;
  accessible: boolean;
  borderColor: string;
}

export const normalizeHex = (value: string, fallback: string = FALLBACK_COLOR): string => {
  const normalized = normalizeStatusColor(value);
  if (normalized === DEFAULT_STATUS_COLOR && fallback !== DEFAULT_STATUS_COLOR) {
    return normalizeStatusColor(fallback);
  }
  return normalized;
};

const hexToRgb = (value: string): RgbColor | null => {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  const hex = normalized.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }
  return { r, g, b } satisfies RgbColor;
};

const toLinear = (channel: number): number => {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return relativeLuminance(FALLBACK_COLOR);
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (foreground: string, background: string): number => {
  const lumA = relativeLuminance(foreground);
  const lumB = relativeLuminance(background);
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
};

export const getAccessiblePalette = (background: string): AccessiblePalette => {
  const normalizedBackground = normalizeHex(background);
  const darkContrast = contrastRatio(normalizedBackground, DARK_TEXT_HEX);
  const lightContrast = contrastRatio(normalizedBackground, LIGHT_TEXT_HEX);

  const prefersDark = darkContrast >= lightContrast;
  const reference: ContrastReference = prefersDark ? 'dark' : 'light';
  const textColorCss = prefersDark ? DARK_TEXT_CSS : LIGHT_TEXT_CSS;
  const textColorHex = prefersDark ? DARK_TEXT_HEX : LIGHT_TEXT_HEX;
  const contrastRatioValue = Math.max(darkContrast, lightContrast);
  const accessible = contrastRatioValue >= WCAG_AA_THRESHOLD;

  return {
    background: normalizedBackground,
    textColorCss,
    textColorHex,
    contrastRatio: contrastRatioValue,
    reference,
    accessible,
    borderColor: prefersDark ? LIGHT_TEXT_HEX : DARK_TEXT_HEX,
  } satisfies AccessiblePalette;
};

export const isAccessibleContrast = (background: string): boolean => getAccessiblePalette(background).accessible;

export const constants = {
  FALLBACK_COLOR,
  DARK_TEXT_HEX,
  LIGHT_TEXT_HEX,
  DARK_TEXT_CSS,
  LIGHT_TEXT_CSS,
  WCAG_AA_THRESHOLD,
} as const;
