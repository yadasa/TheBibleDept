import palette, { BRAND_COLORS } from '../../bibledept-app/src/config/color/palette';

export const brand = BRAND_COLORS;
export const theme = {
  background: palette.light.background,
  surface: '#FFFFFF',
  ink: brand.ink,
  muted: '#74675F',
  orange: brand.orange,
  action: brand.action,
  border: '#E9DBD3',
  tint: '#FFE7D9',
  controlBorder: '#74675F',
  softInk: '#27231F',
  error: '#9F271E',
  success: '#027A48',
  successTint: '#EAF5EE',
};

// Product roles from docs/style-guide. System sans respects the native text size.
export const spacing = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 48: 48, 64: 64 } as const;
export const radius = 4;
export const control = { minHeight: 48, iconSize: 44 } as const;
export const typography = {
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -1 },
  section: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -.5 },
  body: { fontSize: 16, lineHeight: 25 },
  meta: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  button: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
} as const;
