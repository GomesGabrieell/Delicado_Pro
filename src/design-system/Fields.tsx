import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { IconButton } from './Actions';
import { corners, iconSize, palette, space, touchSize, type } from './tokens';

type FieldState = { label: string; error?: string; loading?: boolean; disabled?: boolean };

export function FormField({ label, hint, error, loading, disabled, style, onFocus, onBlur, ...input }: FieldState &
  TextInputProps & { hint?: string }) {
  const [focused, setFocused] = useState(false);
  const locked = disabled || loading || input.editable === false;

  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <View style={[styles.control, focused && styles.focus, error ? styles.invalid : undefined, locked && styles.locked]}>
        <TextInput {...input} accessibilityLabel={label} aria-invalid={Boolean(error)} aria-disabled={Boolean(locked)}
          aria-busy={Boolean(loading)} editable={!locked} placeholderTextColor={palette.muted}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          style={[type.body, styles.input, input.multiline && styles.multiline, style]} />
        {loading && <ActivityIndicator color={palette.accent} />}
      </View>
      <FieldMessage error={error} hint={hint} />
    </View>
  );
}

export function SearchBar({ label, value, onChangeText, error, loading, disabled, placeholder = 'Buscar' }: FieldState & {
  value: string; onChangeText: (value: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={[styles.control, styles.search, focused && styles.focus, error ? styles.invalid : undefined]}>
        <Feather name="search" size={iconSize.medium} color={palette.muted} aria-hidden />
        <TextInput accessibilityLabel={label} aria-invalid={Boolean(error)} aria-disabled={Boolean(disabled)}
          aria-busy={Boolean(loading)} value={value} onChangeText={onChangeText}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          editable={!disabled} placeholder={placeholder} placeholderTextColor={palette.muted}
          returnKeyType="search" style={[type.body, styles.input]} />
        {loading && <ActivityIndicator color={palette.accent} />}
        {value.length > 0 && <IconButton icon="x" label="Limpar busca" onPress={() => onChangeText('')} disabled={disabled} />}
      </View>
      <FieldMessage error={error} />
    </View>
  );
}

function FieldMessage({ hint, error }: { hint?: string; error?: string }) {
  if (error) return <Text accessibilityRole="alert" style={[type.detail, styles.error]}>{error}</Text>;
  return hint ? <Text style={type.detail}>{hint}</Text> : null;
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  control: {
    minHeight: touchSize, paddingHorizontal: space.sm, backgroundColor: palette.background,
    borderColor: palette.border, borderWidth: 1, borderRadius: corners.control,
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
  },
  focus: { borderColor: palette.accent, outlineWidth: 1, outlineColor: palette.accent, outlineStyle: 'solid' },
  invalid: { borderColor: palette.danger },
  locked: { backgroundColor: palette.surface },
  search: { borderRadius: corners.pill },
  input: { flex: 1, minWidth: 0, minHeight: touchSize, paddingVertical: space.xs, outlineWidth: 0 },
  multiline: { minHeight: touchSize * 2, textAlignVertical: 'top' },
  error: { color: palette.danger },
});
