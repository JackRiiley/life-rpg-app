// A basic color palette for our app

const tintColourLight = '#007AFF';
const tintColourDark = '#0A84FF';
const tintColourForest = '#34C759';

export const Themes = {
  light: {
    text: '#171717',
    textSecondary: '#525252',
    background: '#f4f4f8',
    card: '#ffffff',
    tint: tintColourLight,
    border: '#e5e5e5',
    placeholder: '#a3a3a3',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    background: '#000000',
    card: '#1c1c1e',
    tint: tintColourDark,
    border: '#38383a',
    placeholder: '#525252',
  },
  forest: {
    text: '#0a3d1b',
    textSecondary: '#295a38',
    background: '#f0f4f0',
    card: '#ffffff',
    tint: tintColourForest,
    border: '#d6e0d6',
    placeholder: '#6b8a74',
  },
};

// We will export a dynamic object based on the theme
export type Theme = typeof Themes.light;