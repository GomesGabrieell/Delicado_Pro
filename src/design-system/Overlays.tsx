import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, PrimaryButton, SecondaryButton } from './Actions';
import { corners, overlayElevation, palette, space, type } from './tokens';

type OverlayProps = PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>;

function Overlay({ visible, title, onClose, children, sheet, busy = false }: OverlayProps & {
  sheet?: boolean; busy?: boolean;
}) {
  function requestClose() {
    if (!busy) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={requestClose}>
      <SafeAreaProvider style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessible={false} focusable={false} />
        <SafeAreaView style={styles.fill} pointerEvents="box-none">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none" style={[styles.position, sheet && styles.bottom]}>
            <View accessibilityViewIsModal onAccessibilityEscape={requestClose} style={[styles.panel, sheet && styles.sheet]}>
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={[type.section, styles.headingText]}>{title}</Text>
                <IconButton label="Fechar" icon="x" onPress={requestClose} disabled={busy} />
              </View>
              <ScrollView style={styles.scroll} contentContainerStyle={styles.contents} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

export function BottomSheet(props: OverlayProps & { busy?: boolean }) {
  return <Overlay {...props} sheet />;
}

export function ConfirmDialog({ visible, title, description, confirmLabel, onConfirm, onClose, loading, disabled, error, destructive }: {
  visible: boolean; title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void;
  loading?: boolean; disabled?: boolean; error?: string; destructive?: boolean;
}) {
  return (
    <Overlay visible={visible} title={title} onClose={onClose} busy={loading}>
      <Text style={type.body}>{description}</Text>
      {error && <Text accessibilityRole="alert" style={[type.detail, styles.error]}>{error}</Text>}
      <View style={styles.actions}>
        <SecondaryButton label="Cancelar" onPress={onClose} disabled={loading} />
        <PrimaryButton label={confirmLabel} onPress={onConfirm} loading={loading} disabled={disabled}
          tone={destructive ? 'danger' : 'accent'} />
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.scrim },
  fill: { flex: 1 },
  position: { flex: 1, padding: space.md, alignItems: 'center', justifyContent: 'center' },
  bottom: { justifyContent: 'flex-end', paddingBottom: space.sm },
  panel: {
    ...overlayElevation, width: '100%', maxWidth: 460, maxHeight: '90%',
    backgroundColor: palette.background, borderRadius: corners.overlay,
  },
  sheet: { maxWidth: 520 },
  heading: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingLeft: space.lg, paddingRight: space.xs, paddingTop: space.xs,
    borderBottomColor: palette.divider, borderBottomWidth: 1,
  },
  headingText: { flex: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  contents: { gap: space.md, padding: space.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.xs },
  error: { color: palette.danger },
});
