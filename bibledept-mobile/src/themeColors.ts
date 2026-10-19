export const colors = {
  dark: {
    background: '#0A0A09', surface: '#1C1917', ink: '#FFF5F5', muted: '#BEB1A8',
    orange: '#F05A00', action: '#FF914D', onAction: '#0A0A09', onOrange: '#0A0A09',
    border: '#443A33', tint: '#39251A', controlBorder: '#99877B', softInk: '#E9DBD3',
    error: '#FFAAA1', success: '#89D8A9', successTint: '#162D21',
  },
  light: {
    background: '#FFF5F5', surface: '#FFFFFF', ink: '#0A0A09', muted: '#74675F',
    orange: '#F05A00', action: '#B74300', onAction: '#FFFFFF', onOrange: '#0A0A09',
    border: '#E9DBD3', tint: '#FFE7D9', controlBorder: '#74675F', softInk: '#27231F',
    error: '#9F271E', success: '#027A48', successTint: '#EAF5EE',
  },
} as const;
export type ThemeMode = keyof typeof colors;
export type Colors = {[K in keyof typeof colors.dark]: string};
