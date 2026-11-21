export const colors = {
  bg: '#F6F4EE',
  surface: '#FFFFFF',
  ink: '#14201B',
  inkSoft: '#56645D',
  inkFaint: '#8E9A93',
  line: '#E4E1D8',
  brand: '#0F3D2E',
  brandSoft: '#DCEBE3',
  accent: '#F2B33D',
  accentSoft: '#FDF1D6',
  danger: '#C2410C',
  dangerSoft: '#FDE8DC',
  success: '#15803D',
};

/** Distinct, readable avatar colors for people. */
export const personColors = ['#0F766E', '#B45309', '#7C3AED', '#BE185D', '#1D4ED8', '#4D7C0F', '#C2410C', '#0E7490'];

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = (n: number) => n * 4;

export const font = {
  title: { fontSize: 26, fontWeight: '800' as const, color: colors.ink, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  small: { fontSize: 13, color: colors.inkSoft },
  mono: { fontVariant: ['tabular-nums' as const] },
};
