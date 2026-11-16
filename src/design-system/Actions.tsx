import Feather from '@expo/vector-icons/Feather';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { corners, iconSize, interaction, overlayElevation, palette, space, touchSize, type } from './tokens';

export type IconName = ComponentProps<typeof Feather>['name'];
type ActionProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
};
type IconActionProps = ActionProps & { icon: IconName };

function Action({ label, onPress, icon, disabled = false, loading = false, variant }: ActionProps & {
  variant: 'primary' | 'secondary' | 'icon' | 'floating' | 'danger';
}) {
  const [focused, setFocused] = useState(false);
  const locked = disabled || loading;
  const iconOnly = variant === 'icon' || variant === 'floating';
  const filled = variant === 'primary' || variant === 'floating' || variant === 'danger';
  const resting = variant === 'danger' ? palette.danger : palette.accent;
  const foreground = disabled ? interaction.onDisabled : filled ? palette.onAccent : palette.accent;
  const pressedColor = variant === 'danger' ? interaction.dangerPressed : interaction.accentPressed;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} aria-busy={loading}
      aria-disabled={locked} disabled={locked} onPress={onPress}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.action, iconOnly && styles.icon, variant === 'floating' && styles.floating,
        filled
          ? { backgroundColor: pressed ? pressedColor : resting, borderColor: pressed ? pressedColor : resting }
          : { backgroundColor: pressed ? interaction.pressed : variant === 'icon' ? 'transparent' : palette.accentSurface,
              borderColor: 'transparent' },
        disabled && styles.disabled, focused && styles.focus,
      ]}>
      {loading ? <ActivityIndicator color={foreground} /> : icon && (
        <Feather name={icon} size={iconSize.medium} color={foreground} aria-hidden />
      )}
      {!iconOnly && <Text style={[type.label, styles.label, { color: foreground }]}>{label}</Text>}
    </Pressable>
  );
}

export function PrimaryButton(props: ActionProps & { tone?: 'accent' | 'danger' }) {
  return <Action {...props} variant={props.tone === 'danger' ? 'danger' : 'primary'} />;
}

export function SecondaryButton(props: ActionProps) {
  return <Action {...props} variant="secondary" />;
}

export function IconButton(props: IconActionProps) {
  return <Action {...props} variant="icon" />;
}

export function FloatingActionButton(props: IconActionProps) {
  return <Action {...props} variant="floating" />;
}

const styles = StyleSheet.create({
  action: {
    minHeight: touchSize, borderRadius: corners.pill, borderWidth: 1,
    paddingVertical: space.sm, paddingHorizontal: space.md, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: space.xs,
  },
  icon: { width: touchSize, padding: 0, borderRadius: corners.pill },
  floating: { ...overlayElevation, width: 56, minHeight: 56, borderRadius: corners.surface },
  disabled: { backgroundColor: interaction.disabled, borderColor: palette.divider },
  focus: { outlineColor: interaction.focus, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  label: { flexShrink: 1, textAlign: 'center' },
});
