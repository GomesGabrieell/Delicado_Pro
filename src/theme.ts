import { corners, interaction, palette, space, touchSize, type } from './design-system/tokens';

export const colors = {
  graphite: palette.text,
  white: palette.background,
  offWhite: palette.surface,
  blueGray: palette.accent,
  muted: palette.muted,
  border: palette.border,
  error: palette.danger,
  divider: palette.divider,
  selection: palette.accentSurface,
  pressed: interaction.pressed,
};

export const spacing = {
  tiny: space.xxs,
  small: space.xs,
  compact: space.sm,
  medium: space.md,
  large: space.lg,
  extraLarge: space.xl,
};

export const radius = corners;
export const touchTarget = touchSize;
export const typography = { ...type, meta: type.detail };
