import { Feather } from '@expo/vector-icons';
import { PlatformPressable, useLinkBuilder } from 'expo-router/react-navigation';
import type { BottomTabBarButtonProps, BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, View, useWindowDimensions,
} from 'react-native';

import { corners, iconSize, interaction, palette, space, touchSize, type } from '../design-system/tokens';

function useMotion() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduce) => {
      if (active) setEnabled(!reduce);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (active) setEnabled(!reduce);
    }).catch(() => {});
    return () => { active = false; subscription?.remove(); };
  }, []);
  return enabled;
}

export function MenuButton({ style, onPressIn, onPressOut, ...props }: BottomTabBarButtonProps) {
  const motion = useMotion();
  const [offset] = useState(() => new Animated.Value(0));
  const move = (toValue: number) => {
    if (!motion) {
      offset.setValue(0);
      return;
    }
    Animated.timing(offset, {
      toValue, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return <PlatformPressable {...props} style={[style, { transform: [{ translateX: offset }] }]}
    pressColor={interaction.pressed} pressOpacity={0.65}
    onPressIn={(event) => { move(-4); onPressIn?.(event); }}
    onPressOut={(event) => { move(0); onPressOut?.(event); }} />;
}

export function CompactMainMenu({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [open, setOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Platform.OS !== 'web' && Keyboard.isVisible());
  const motion = useMotion();
  const [slide] = useState(() => new Animated.Value(0));
  const { width } = useWindowDimensions();
  const { buildHref } = useLinkBuilder();
  const panelWidth = Math.min(320, Math.round(width * 0.87));
  const current = descriptors[state.routes[state.index].key].options.title;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const openMenu = () => {
    slide.setValue(motion ? panelWidth : 0);
    setOpen(true);
    if (motion) {
      Animated.timing(slide, { toValue: 0, duration: 210, easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web' }).start();
    }
  };
  const closeMenu = () => setOpen(false);

  if (keyboardVisible && !open) return null;

  return <>
    <View style={[styles.bar, {
      paddingBottom: insets.bottom + space.xxs, paddingLeft: insets.left + space.md,
      paddingRight: insets.right + space.md,
    }]}>
      <Text style={[type.label, styles.current]}>{current}</Text>
      <MenuButton accessibilityRole="button" accessibilityLabel="Abrir menu" accessibilityState={{ expanded: open }}
        onPress={openMenu} style={[styles.row, styles.trigger]}>
        <Text style={styles.activeText}>Menu</Text>
        <Feather name="menu" color={palette.accent} size={iconSize.medium} />
      </MenuButton>
    </View>
    <Modal transparent visible={open} onRequestClose={closeMenu} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.overlay}>
        <Pressable accessible={false} tabIndex={-1} onPress={closeMenu} style={StyleSheet.absoluteFill} />
        <Animated.View accessibilityViewIsModal style={[styles.panel, {
          width: panelWidth, paddingTop: insets.top + space.sm, paddingRight: insets.right + space.sm,
          paddingBottom: insets.bottom + space.sm, transform: [{ translateX: slide }],
        }]}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={type.section}>Menu</Text>
            <MenuButton accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={closeMenu}
              style={[styles.row, styles.close]}>
              <Feather name="x" color={palette.accent} size={iconSize.large} />
            </MenuButton>
          </View>
          <ScrollView contentContainerStyle={styles.items}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const selected = state.index === index;
              const color = selected ? palette.accent : palette.muted;
              return <MenuButton key={route.key} href={buildHref(route.name, route.params)}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                aria-current={Platform.OS === 'web' && selected ? 'page' : undefined}
                accessibilityState={{ selected }} style={[styles.row, selected && styles.selected]} onPress={() => {
                  const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (event.defaultPrevented) return;
                  closeMenu();
                  if (!selected) navigateToTab(route.key);
                }}>
                {selected && <Feather name="check" color={color} size={iconSize.small} />}
                <Text style={[type.label, styles.itemLabel, selected && styles.activeText]}>{options.title}</Text>
                {options.tabBarIcon?.({ focused: selected, color, size: iconSize.medium })}
              </MenuButton>;
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.xxs,
    backgroundColor: palette.background, borderTopColor: palette.divider, borderTopWidth: StyleSheet.hairlineWidth,
  },
  current: { flex: 1, color: palette.muted, textAlign: 'right' },
  overlay: { flex: 1, alignItems: 'flex-end', backgroundColor: palette.scrim },
  panel: { flex: 1, backgroundColor: palette.background, paddingLeft: space.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: space.sm, marginBottom: space.sm },
  items: { gap: space.xxs },
  row: {
    minHeight: touchSize, paddingHorizontal: space.sm, paddingVertical: space.xs, gap: space.xs,
    borderRadius: corners.control, flexDirection: 'row', alignItems: 'center',
  },
  trigger: { backgroundColor: palette.accentSurface },
  close: { minWidth: touchSize, justifyContent: 'center' },
  itemLabel: { flex: 1, textAlign: 'right' },
  selected: { backgroundColor: palette.accentSurface },
  activeText: { ...type.label, color: palette.accent },
});
