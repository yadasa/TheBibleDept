/** Every orange accent starts with the waveform's existing pigment. */
export const BRAND_ORANGE = '#F05A00';
const orangeRGB = [240, 90, 0] as const;
const ink = '#0A0A09', paper = '#FFF5F5';
function blendOrange(background: string, opacity: number): string {
  const base = background.slice(1).match(/../g)!.map(channel => parseInt(channel, 16));
  return '#' + orangeRGB.map((channel, index) => Math.round(channel * opacity + base[index] * (1 - opacity)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function orangeAlpha(opacity: number): string {
  const alpha = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0;
  return `rgba(${orangeRGB.join(',')},${alpha})`;
}
/** Brightness and transparency variants retain the same orange pigment. */
export const ORANGE_TONES = {
  base: BRAND_ORANGE,
  light: blendOrange('#FFFFFF', .74),
  highlight: blendOrange('#FFFFFF', .18),
  darkTint: blendOrange(ink, .16),
  lightTint: blendOrange(paper, .14),
} as const;
export const brand = { orange: BRAND_ORANGE, action: BRAND_ORANGE, ink, paper } as const;

export const colors = {
  dark: {
    background: "#0A0A09",
    surface: "#1C1917",
    ink: "#FFF5F5",
    muted: "#BEB1A8",
    orange: BRAND_ORANGE,
    action: BRAND_ORANGE,
    actionText: "#FFF5F5",
    onAction: "#0A0A09",
    onOrange: "#0A0A09",
    border: "#443A33",
    tint: ORANGE_TONES.darkTint,
    controlBorder: "#99877B",
    softInk: "#E9DBD3",
    error: "#FFAAA1",
    success: "#89D8A9",
    successTint: "#162D21",
  },
  light: {
    background: "#FFF5F5",
    surface: "#FFFFFF",
    ink: "#0A0A09",
    muted: "#74675F",
    orange: BRAND_ORANGE,
    action: BRAND_ORANGE,
    actionText: "#0A0A09",
    onAction: "#0A0A09",
    onOrange: "#0A0A09",
    border: "#E9DBD3",
    tint: ORANGE_TONES.lightTint,
    controlBorder: "#74675F",
    softInk: "#27231F",
    error: "#9F271E",
    success: "#027A48",
    successTint: "#EAF5EE",
  },
} as const;
export type ThemeMode = keyof typeof colors;
export type Colors = { [K in keyof typeof colors.dark]: string };

/** Light surfaces need a contrast bed and chromatic bloom to keep white cores visible. */
export const luminousPalettes={
  dark:{calendarWell:'transparent',calendarInset:'none',empty:ORANGE_TONES.darkTint,emptyBorder:colors.dark.border,
    track:colors.dark.border,trackInset:'none',progressGlow:'255,174,38',progressCore:'255,255,255',
    streakGlow:'0 0 2px 1px rgba(255,224,135,1), 0 0 5px 1px rgba(255,167,32,1)'},
  light:{calendarWell:'#D9CCBD',calendarInset:'inset 0 1px 5px rgba(96,63,32,.14), 0 1px 0 rgba(255,255,255,.9)',
    empty:'#CDBDAA',emptyBorder:'rgba(104,75,48,.22)',track:'#C8B6A5',trackInset:'inset 0 1px 2px rgba(88,51,20,.22)',
    progressGlow:'190,87,0',progressCore:'235,143,20',
    streakGlow:'0 0 2px 1px rgba(190,87,0,.95), 0 0 5px 1px rgba(232,132,0,1)'},
} as const;
