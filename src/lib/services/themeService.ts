/**
 * Theme Service
 * Handles dark/light mode toggle and theme preferences
 */

// ============================================
// Types
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  accent: string;
  accentForeground: string;
}

export interface ThemePreferences {
  mode: ThemeMode;
  accentColor: string;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// ============================================
// Constants
// ============================================

const THEME_KEY = 'theme_preferences';
const THEME_ATTRIBUTE = 'data-theme';

const DEFAULT_PREFS: ThemePreferences = {
  mode: 'system',
  accentColor: 'emerald',
  reducedMotion: false,
  fontSize: 'medium',
};

export const ACCENT_COLORS = [
  { name: 'Emerald', value: 'emerald', color: '#10b981' },
  { name: 'Blue', value: 'blue', color: '#3b82f6' },
  { name: 'Purple', value: 'purple', color: '#8b5cf6' },
  { name: 'Rose', value: 'rose', color: '#f43f5e' },
  { name: 'Orange', value: 'orange', color: '#f97316' },
  { name: 'Teal', value: 'teal', color: '#14b8a6' },
];

// ============================================
// Theme Detection
// ============================================

/**
 * Get system preference for dark mode
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get current resolved theme (accounting for system preference)
 */
export function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

// ============================================
// Theme Application
// ============================================

/**
 * Apply theme to document
 */
export function applyTheme(mode: ThemeMode): void {
  const resolved = getResolvedTheme(mode);
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('light', 'dark');

  // Add new theme class
  root.classList.add(resolved);

  // Set attribute for CSS selectors
  root.setAttribute(THEME_ATTRIBUTE, resolved);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#ffffff');
  }
}

/**
 * Apply accent color
 */
export function applyAccentColor(accentColor: string): void {
  const root = document.documentElement;
  root.setAttribute('data-accent', accentColor);
}

/**
 * Apply font size
 */
export function applyFontSize(size: 'small' | 'medium' | 'large'): void {
  const root = document.documentElement;
  root.classList.remove('text-sm', 'text-base', 'text-lg');

  const sizeMap = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  root.classList.add(sizeMap[size]);
}

/**
 * Apply reduced motion preference
 */
export function applyReducedMotion(reduced: boolean): void {
  const root = document.documentElement;
  if (reduced) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
}

/**
 * Apply all theme preferences
 */
export function applyAllPreferences(prefs: ThemePreferences): void {
  applyTheme(prefs.mode);
  applyAccentColor(prefs.accentColor);
  applyFontSize(prefs.fontSize);
  applyReducedMotion(prefs.reducedMotion);
}

// ============================================
// Preferences Storage
// ============================================

/**
 * Get theme preferences from storage
 */
export function getThemePreferences(): ThemePreferences {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFS;
}

/**
 * Save theme preferences
 */
export function saveThemePreferences(prefs: Partial<ThemePreferences>): ThemePreferences {
  const current = getThemePreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(THEME_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Set theme mode
 */
export function setThemeMode(mode: ThemeMode): void {
  const updated = saveThemePreferences({ mode });
  applyTheme(updated.mode);
}

/**
 * Toggle between light and dark
 */
export function toggleTheme(): 'light' | 'dark' {
  const current = getThemePreferences();
  const resolved = getResolvedTheme(current.mode);
  const newMode = resolved === 'light' ? 'dark' : 'light';
  setThemeMode(newMode);
  return newMode;
}

// ============================================
// System Theme Listener
// ============================================

/**
 * Listen for system theme changes
 */
export function listenForSystemThemeChanges(callback: (theme: 'light' | 'dark') => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    const prefs = getThemePreferences();
    if (prefs.mode === 'system') {
      const newTheme = e.matches ? 'dark' : 'light';
      applyTheme('system');
      callback(newTheme);
    }
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

// ============================================
// Initialize
// ============================================

/**
 * Initialize theme on app load
 */
export function initializeTheme(): void {
  const prefs = getThemePreferences();
  applyAllPreferences(prefs);
}

// ============================================
// Export Service
// ============================================

export const themeService = {
  getSystemTheme,
  getResolvedTheme,
  applyTheme,
  applyAccentColor,
  applyFontSize,
  applyReducedMotion,
  applyAllPreferences,
  getThemePreferences,
  saveThemePreferences,
  setThemeMode,
  toggleTheme,
  listenForSystemThemeChanges,
  initializeTheme,
  ACCENT_COLORS,
};
