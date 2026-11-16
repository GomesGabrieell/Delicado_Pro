import { StyleSheet } from 'react-native';

import { FormField, SecondaryButton } from '../design-system';
import { FilterChip } from '../design-system/Content';
import { cardElevation, corners, interaction, palette, space, type } from '../design-system/tokens';

export function Field({ label, value, onChangeText, decimal, maxLength = 120, disabled, multiline }: {
  label: string; value: string; onChangeText: (value: string) => void;
  decimal?: boolean; maxLength?: number; disabled?: boolean; multiline?: boolean;
}) {
  return <FormField label={label} value={value} onChangeText={onChangeText} maxLength={maxLength}
    keyboardType={decimal ? 'decimal-pad' : 'default'} disabled={disabled} multiline={multiline} />;
}

export function Chip({ label, active, onPress, disabled }: {
  label: string; active?: boolean; onPress: () => void; disabled?: boolean;
}) {
  return active === undefined ? <SecondaryButton label={label} onPress={onPress} disabled={disabled} />
    : <FilterChip option={{ id: label, label, disabled }} selected={active} onSelect={onPress} />;
}

export const catalogStyles = StyleSheet.create({
  stack: { gap: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  card: { ...cardElevation, backgroundColor: palette.background, borderRadius: corners.surface, padding: space.md, gap: space.sm },
  results: { backgroundColor: palette.background, borderRadius: corners.surface, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
  search: { flexGrow: 1, flexBasis: 150, minWidth: 0 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingRight: space.xs },
  productCopy: { flex: 1, minWidth: 0 },
  kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  kindTile: {
    flexGrow: 1, flexBasis: 86, minHeight: 84, padding: space.sm, gap: space.xs,
    justifyContent: 'center', alignItems: 'center', borderRadius: corners.surface,
    borderWidth: 1, borderColor: palette.divider, backgroundColor: palette.background,
  },
  kindActive: { backgroundColor: palette.accentSurface, borderColor: palette.accent },
  kindPressed: { backgroundColor: interaction.pressed },
  kindLabel: { ...type.label, textAlign: 'center' },
  kindLabelActive: { color: palette.accent, fontWeight: '800' },
  title: { ...type.label, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  text: type.detail,
  strong: { ...type.label, color: palette.accent },
  error: { ...type.detail, color: palette.danger },
  photo: { width: '100%', height: 200, borderRadius: corners.control, backgroundColor: palette.surface },
});
