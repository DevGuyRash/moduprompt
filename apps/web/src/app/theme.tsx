import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = Theme | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  appliedTheme: Theme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty('color-scheme', theme === 'dark' ? 'dark' : 'light');
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider = ({ children, defaultMode = 'system' }: ThemeProviderProps): JSX.Element => {
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme());
  const [mode, setMode] = useState<ThemeMode>(defaultMode);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    setSystemTheme(media.matches ? 'dark' : 'light');

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const appliedTheme: Theme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    applyThemeToDocument(appliedTheme);
  }, [appliedTheme]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      appliedTheme,
    }),
    [mode, appliedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
