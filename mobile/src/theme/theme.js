export const theme = {
  colors: {
    background: '#09090b', // Zinc 950
    surface: '#18181b',    // Zinc 900
    surfaceLight: '#27272a', // Zinc 800
    border: '#27272a',     // Zinc 800
    borderLight: '#3f3f46', // Zinc 700
    text: '#fafafa',       // Zinc 50
    textSecondary: '#a1a1aa', // Zinc 400
    textMuted: '#71717a',     // Zinc 500
    primary: '#fafafa',    // Zinc 50 (monochrome primary)
    primaryInverse: '#09090b',
    accent: '#10b981',     // Emerald 500 (emerald accent)
    accentLight: '#047857',
    error: '#ef4444',      // Red 500
    success: '#10b981',
    warning: '#f59e0b',
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  roundness: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  }
};
