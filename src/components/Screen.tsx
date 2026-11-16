import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, space, type } from '../design-system/tokens';
import { BrandIcon } from './BrandIcon';

type ScreenProps = PropsWithChildren<{
  title: string; description?: string; topInset?: boolean; action?: ReactNode; layout?: 'wide' | 'compact' | 'full';
}>;

export function Screen({ title, description, children, topInset, action, layout }: ScreenProps) {
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView edges={topInset ? ['top', 'left', 'right'] : ['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, width >= 840 && styles.desktop, layout === 'compact' && styles.centered]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={[styles.column, layout === 'wide' && styles.wide, layout === 'compact' && styles.compact,
          layout === 'full' && styles.full]}>
          <View style={styles.headingRow}>
            <BrandIcon />
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={type.title}>{title}</Text>
              {description ? <Text style={type.detail}>{description}</Text> : null}
            </View>
            {action}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.canvas },
  content: { flexGrow: 1, padding: space.md, paddingTop: space.lg, paddingBottom: space.xl },
  desktop: { padding: space.xl },
  centered: { justifyContent: 'center' },
  column: { alignSelf: 'center', width: '100%', maxWidth: 720, gap: space.lg },
  wide: { maxWidth: 1080 },
  compact: { maxWidth: 440 },
  full: { maxWidth: '100%', flexGrow: 1 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  heading: { flexGrow: 1, flexShrink: 1, gap: space.xxs },
});
