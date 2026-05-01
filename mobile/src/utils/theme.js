/**
 * Application Theme Configuration
 * Professional "Industrial Hardware" theme with deep blues, grays, and high-contrast accents
 */

export const theme = {
  colors: {
    primary: '#D4A017',
    primaryDark: '#C9921A',
    primaryLight: '#E0B43B',
    secondary: '#2A2A2A',
    secondaryLight: '#3A3A3A',
    accent: '#D4A017',
    accentDark: '#C9921A',
    success: '#C9921A',
    successDark: '#B88316',
    danger: '#E15B64',
    dangerDark: '#C74A53',
    warning: '#D4A017',
    warningDark: '#C9921A',
    info: '#D4A017',
    background: '#0A0A0A',
    backgroundDark: '#111111',
    surface: '#1E1E1E',
    surfaceDark: '#222222',
    text: '#FFFFFF',
    textLight: '#AAAAAA',
    textLighter: '#8F8F8F',
    border: '#3A3A3A',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 16,
    round: 25,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
  },
};

export default theme;
