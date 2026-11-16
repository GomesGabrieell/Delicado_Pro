import { Platform, StyleSheet } from 'react-native';

export const palette = {
  background: '#FFFFFF',
  canvas: '#F5F5FC',
  surface: '#F0EFFA',
  text: '#19182C',
  muted: '#595873',
  divider: '#E6E4F2',
  border: '#8C8AA7',
  accent: '#5142D5',
  onAccent: '#FFFFFF',
  accentSurface: '#ECE9FF',
  hero: '#252057',
  heroGlow: '#393180',
  heroGlowStrong: '#493DA4',
  onHero: '#DFDBFF',
  danger: '#9F302C',
  dangerSurface: '#FBEDEB',
  warning: '#755013',
  warningSurface: '#FCF2DD',
  scrim: 'rgba(25, 24, 44, 0.5)',
};

export const interaction = {
  pressed: '#E3DFFF',
  accentPressed: '#3F31B0',
  dangerPressed: '#852621',
  focus: palette.accent,
  disabled: '#E9E8F2',
  onDisabled: palette.muted,
};

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 };
export const corners = { control: 16, surface: 24, overlay: 30, pill: 999 };
export const iconSize = { small: 16, medium: 20, large: 24, empty: 28 };
export const touchSize = 48;
export const overlayElevation = {
  elevation: 5,
  shadowColor: palette.hero,
  shadowOpacity: 0.14,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};
export const cardElevation = Platform.OS === 'web'
  ? { boxShadow: '0 8px 24px rgba(37, 32, 87, 0.07)' }
  : { elevation: 1, shadowColor: palette.hero, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } };

const family = Platform.select({ web: 'system-ui' });
export const type = StyleSheet.create({
  title: { fontFamily: family, fontSize: 38, lineHeight: 45, fontWeight: '800', letterSpacing: -1.4, color: palette.text },
  section: { fontFamily: family, fontSize: 22, lineHeight: 29, fontWeight: '700', letterSpacing: -0.55, color: palette.text },
  label: { fontFamily: family, fontSize: 15, lineHeight: 21, fontWeight: '600', color: palette.text },
  body: { fontFamily: family, fontSize: 16, lineHeight: 24, color: palette.text },
  detail: { fontFamily: family, fontSize: 14, lineHeight: 20, color: palette.muted },
});
