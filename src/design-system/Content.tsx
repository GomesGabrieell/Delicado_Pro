import Feather from '@expo/vector-icons/Feather';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandIcon } from '../components/BrandIcon';
import { IconButton, SecondaryButton, type IconName } from './Actions';
import { corners, iconSize, interaction, palette, space, touchSize, type } from './tokens';

export function AppHeader({ title, subtitle, onBack, action }: {
  title: string; subtitle?: string; onBack?: () => void; action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack && <IconButton icon="arrow-left" label="Voltar" onPress={onBack} />}
      <BrandIcon />
      <View style={styles.headerCopy}>
        <Text accessibilityRole="header" style={type.section}>{title}</Text>
        {subtitle ? <Text style={type.detail}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

type Filter = { id: string; label: string; disabled?: boolean };

export function FilterChip({ option, selected, onSelect }: { option: Filter; selected: boolean; onSelect: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="button" aria-pressed={selected} aria-disabled={Boolean(option.disabled)}
      disabled={option.disabled} onPress={onSelect} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed,
        option.disabled && styles.chipDisabled, focused && styles.focus]}>
      <Text style={[type.label, styles.wrap, selected && styles.selectedLabel, option.disabled && styles.muted]}>{option.label}</Text>
    </Pressable>
  );
}

export function FilterChips({ label, options, selected, onSelect, loading, error }: {
  label: string; options: readonly Filter[]; selected: string; onSelect: (id: string) => void; loading?: boolean; error?: string;
}) {
  if (loading) return <LoadingState label={`Carregando ${label.toLocaleLowerCase('pt-BR')}…`} />;
  if (error) return <Text accessibilityRole="alert" style={[type.detail, styles.error]}>{error}</Text>;
  return <View accessibilityLabel={label} style={styles.chips}>
    {options.map((option) => <FilterChip key={option.id} option={option} selected={option.id === selected}
      onSelect={() => onSelect(option.id)} />)}
  </View>;
}

export function ListItem({ title, detail, icon, trailing, onPress, disabled, loading, error }: {
  title: string; detail?: string; icon?: IconName; trailing?: ReactNode; onPress?: () => void;
  disabled?: boolean; loading?: boolean; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const content = <>
    {icon && <View style={styles.listIcon}><Feather name={icon} size={iconSize.medium} color={palette.accent} aria-hidden /></View>}
    <View style={styles.rowCopy}>
      <Text style={[type.label, disabled && styles.muted]}>{title}</Text>
      {detail ? <Text style={type.detail}>{detail}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={[type.detail, styles.error]}>{error}</Text> : null}
    </View>
    {trailing && <View style={styles.trailing}>{trailing}</View>}
    {loading ? <ActivityIndicator color={palette.accent} /> : onPress && (
      <Feather name="chevron-right" size={iconSize.small} color={palette.muted} aria-hidden />
    )}
  </>;
  if (!onPress) return <View style={styles.row} aria-busy={Boolean(loading)}>{content}</View>;
  return <Pressable accessibilityRole="button" aria-disabled={Boolean(disabled || loading)} aria-busy={Boolean(loading)}
    disabled={disabled || loading} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.row, pressed && styles.pressed, focused && styles.focus]}>{content}</Pressable>;
}

const badgeColors = {
  neutral: [palette.surface, palette.muted],
  positive: [palette.accentSurface, palette.accent],
  warning: [palette.warningSurface, palette.warning],
  error: [palette.dangerSurface, palette.danger],
} as const;

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof badgeColors }) {
  const [backgroundColor, color] = badgeColors[tone];
  return <View style={[styles.badge, { backgroundColor }]}><Text style={[type.detail, styles.badgeText, { color }]}>{label}</Text></View>;
}

export function EmptyState({ title, description, icon = 'inbox', action, error = false }: {
  title: string; description?: string; icon?: IconName; action?: { label: string; onPress: () => void }; error?: boolean;
}) {
  return (
    <View style={styles.state}>
      <View style={[styles.emptyIcon, error && styles.errorIcon]}>
        <Feather name={icon} size={iconSize.empty} color={error ? palette.danger : palette.accent} aria-hidden />
      </View>
      <Text accessibilityRole={error ? 'alert' : 'header'} style={[type.section, styles.center]}>{title}</Text>
      {description ? <Text style={[type.detail, styles.center]}>{description}</Text> : null}
      {action && <SecondaryButton {...action} />}
    </View>
  );
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return <View style={styles.loading} aria-live="polite" aria-busy>
    <ActivityIndicator color={palette.accent} />
    <Text style={type.detail}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  header: {
    minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.md, paddingVertical: space.xxs, backgroundColor: palette.background,
    borderBottomWidth: 1, borderBottomColor: palette.divider,
  },
  headerCopy: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%', minHeight: touchSize,
    paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: corners.pill,
    borderWidth: 1, borderColor: 'transparent', backgroundColor: palette.surface,
  },
  chipSelected: { backgroundColor: palette.accentSurface },
  selectedLabel: { color: palette.accent, fontWeight: '800' },
  chipDisabled: { backgroundColor: interaction.disabled, borderColor: palette.divider },
  pressed: { backgroundColor: interaction.pressed },
  focus: { outlineColor: interaction.focus, outlineWidth: 2, outlineStyle: 'solid' },
  wrap: { flexShrink: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 68,
    paddingHorizontal: space.sm, paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: palette.divider,
  },
  listIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: corners.control, backgroundColor: palette.accentSurface },
  rowCopy: { flex: 1, gap: space.xxs },
  trailing: { flexShrink: 1, maxWidth: '40%' },
  muted: { color: palette.muted },
  error: { color: palette.danger },
  badge: { alignSelf: 'flex-start', paddingHorizontal: space.xs, paddingVertical: space.xxs, borderRadius: corners.pill },
  badgeText: { fontWeight: '600', textAlign: 'center' },
  state: { alignItems: 'center', gap: space.sm, padding: space.lg, backgroundColor: palette.background, borderRadius: corners.surface },
  emptyIcon: { padding: space.sm, borderRadius: corners.pill, backgroundColor: palette.accentSurface },
  errorIcon: { backgroundColor: palette.dangerSurface },
  center: { textAlign: 'center' },
  loading: { minHeight: touchSize, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
});
