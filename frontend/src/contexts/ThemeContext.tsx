import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
  gradient: string;
  glass: string;
}

interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const lightColors: ThemeColors = {
  primary: '#d32f2f',
  secondary: '#f44336',
  accent: '#ff6b6b',
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#212529',
  textSecondary: '#6c757d',
  border: '#dee2e6',
  shadow: 'rgba(0, 0, 0, 0.1)',
  gradient: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
  glass: 'rgba(255, 255, 255, 0.9)'
};

const darkColors: ThemeColors = {
  primary: '#ff5252',
  secondary: '#ff6b6b',
  accent: '#ff8a80',
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  border: '#333333',
  shadow: 'rgba(0, 0, 0, 0.3)',
  gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
  glass: 'rgba(30, 30, 30, 0.9)'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('oneblood-theme') as ThemeMode;
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      return saved;
    }
    return 'auto';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Detect system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemPrefersDark);

    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [themeMode, systemPrefersDark]);

  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemPrefersDark);
  const colors = isDark ? darkColors : lightColors;

  const theme: Theme = {
    mode: themeMode,
    colors,
    isDark
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('oneblood-theme', mode);
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for theme-aware styling
export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

// CSS-in-JS theme helper
export const createThemeStyles = (colors: ThemeColors) => ({
  background: colors.background,
  color: colors.text,
  borderColor: colors.border,
  boxShadow: `0 4px 12px ${colors.shadow}`,
  backgroundGradient: colors.gradient,
  glass: {
    background: colors.glass,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${colors.border}`
  }
});