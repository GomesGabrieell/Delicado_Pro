import { Feather } from '@expo/vector-icons';
import type { ComponentProps, PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Company } from '../catalog/model';
import { colors, radius, spacing, touchTarget, typography } from '../theme';
import { cardElevation } from '../design-system/tokens';

type Icon = ComponentProps<typeof Feather>['name'];

export function WorkspaceAction({ label, onPress, icon, primary }: {
  label: string; onPress: () => void; icon?: Icon; primary?: boolean;
}) {
  const color = primary ? colors.white : colors.blueGray;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.action, primary && styles.primary, pressed && (primary ? styles.primaryPressed : styles.pressed)]}>
      {icon && <Feather name={icon} size={18} color={color} />}
      <Text style={[typography.label, { color, flexShrink: 1 }]}>{label}</Text>
    </Pressable>
  );
}

export function WorkspaceList({ children }: PropsWithChildren) {
  return <View style={styles.list}>{children}</View>;
}

export function WorkspaceRow({ title, detail, icon, leading, onPress }: {
  title: string; detail?: string; icon?: Icon; leading?: string; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={[title, detail].filter(Boolean).join(', ')}
      onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {(icon || leading) && <View style={styles.leading}>
        {icon ? <Feather name={icon} size={18} color={colors.blueGray} /> : <Text style={styles.leadingText}>{leading}</Text>}
      </View>}
      <View style={styles.rowCopy}>
        <Text style={typography.label}>{title}</Text>
        {detail && <Text style={typography.meta}>{detail}</Text>}
      </View>
      <Feather name="chevron-right" size={17} color={colors.blueGray} />
    </Pressable>
  );
}

export function WorkspaceState({ loading, error, message, retry }: {
  loading?: boolean; error?: string; message: string; retry?: () => void;
}) {
  if (loading) return <View style={styles.state}>
    <ActivityIndicator accessibilityLabel="Carregando" color={colors.blueGray} />
  </View>;
  return <View style={styles.state}>
    <Text accessibilityRole={error ? 'alert' : undefined}
      style={[typography.body, error && styles.error]}>{error || message}</Text>
      {Boolean(error) && retry && <WorkspaceAction label="Tentar novamente" icon="refresh-cw" onPress={retry} />}
  </View>;
}

export function CompanyPicker({ company, companies, onSelect }: {
  company: Company; companies: Company[]; onSelect: (id: string) => void;
}) {
  if (companies.length === 1) return <Text style={typography.body}>{company.name}</Text>;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Empresa em contexto" style={styles.choices}>
      {companies.map(({ id, name }) => {
        const selected = company.id === id;
        return <Pressable key={id} accessibilityRole="radio" accessibilityLabel={name} aria-checked={selected}
          onPress={() => onSelect(id)}
          style={({ pressed }) => [styles.choice, selected && styles.selected, pressed && styles.pressed]}>
          {selected && <Feather name="check" size={16} color={colors.blueGray} />}
          <Text style={[typography.label, styles.choiceName]}>{name}</Text>
        </Pressable>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.compact, paddingVertical: spacing.small, gap: spacing.small, borderRadius: radius.control,
  },
  primary: { backgroundColor: colors.blueGray, paddingHorizontal: spacing.medium, borderRadius: radius.pill },
  primaryPressed: { backgroundColor: colors.blueGray },
  pressed: { backgroundColor: colors.pressed },
  list: {
    ...cardElevation,
    backgroundColor: colors.white, borderColor: colors.divider, borderWidth: 1, borderRadius: radius.surface,
    overflow: 'hidden', gap: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 64, padding: spacing.compact, flexDirection: 'row', alignItems: 'center', gap: spacing.compact,
    borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leading: {
    minWidth: 40, minHeight: 40, borderRadius: radius.control, padding: spacing.tiny,
    backgroundColor: colors.selection, alignItems: 'center', justifyContent: 'center',
  },
  leadingText: { color: colors.blueGray, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowCopy: { flex: 1, gap: spacing.tiny },
  state: { padding: spacing.medium, alignItems: 'flex-start', gap: spacing.tiny },
  error: { color: colors.error },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.small },
  choice: {
    maxWidth: '100%', minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.small,
    paddingHorizontal: spacing.compact, paddingVertical: spacing.small, borderWidth: 1,
    borderColor: colors.divider, borderRadius: radius.pill, backgroundColor: colors.white,
  },
  choiceName: { flexShrink: 1 },
  selected: { backgroundColor: colors.selection, borderColor: colors.blueGray },
});
