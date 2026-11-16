import { Feather } from '@expo/vector-icons';
import { useIsFocused } from 'expo-router';
import { Tabs, type TabsScreenOptions } from 'expo-router/js-tabs';
import { useState, type ComponentProps, type PropsWithChildren } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CompactMainMenu, MenuButton } from '../../navigation/MainMenu';
import { SelectedCompanyContext } from '../../navigation/useCompanies';
import { useRouteSession } from '../../navigation/useRouteSession';
import { corners, iconSize, palette, space, touchSize } from '../../design-system/tokens';

function destination(title: string, name: ComponentProps<typeof Feather>['name']): TabsScreenOptions {
  return {
    title,
    tabBarAccessibilityLabel: title,
    tabBarIcon: function TabIcon({ focused }) {
      return <View style={[styles.icon, focused && styles.activeIcon]}>
        <Feather name={name} size={iconSize.medium} color={focused ? palette.accent : palette.muted} />
      </View>;
    },
    tabBarLabel: function TabLabel({ focused }) {
      return <Text style={[styles.label, focused && styles.activeLabel]}>{title}</Text>;
    },
  };
}

function WebTabScene({ children }: PropsWithChildren) {
  const focused = useIsFocused();
  return <View aria-hidden={!focused} style={focused ? styles.scene : styles.hidden}>{children}</View>;
}

export default function MainLayout() {
  const auth = useRouteSession();
  const [companyId, selectCompany] = useState('');
  const { width } = useWindowDimensions();
  const sidebar = Platform.OS === 'web' && width >= 1024;

  return (
    <SelectedCompanyContext.Provider value={{ companyId, selectCompany }}>
      <Tabs backBehavior="history" tabBar={sidebar && auth ? undefined
        : (props) => auth ? <CompactMainMenu {...props} /> : null} screenLayout={Platform.OS === 'web'
        ? ({ children }) => <WebTabScene>{children}</WebTabScene>
        : undefined} screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarPosition: sidebar ? 'right' : 'bottom',
        tabBarLabelPosition: 'beside-icon',
        tabBarButton: (props) => <MenuButton {...props} />,
        tabBarItemStyle: styles.item,
        tabBarStyle: [styles.bar, styles.sidebar],
        tabBarActiveBackgroundColor: palette.accentSurface,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
      }}>
        <Tabs.Screen name="index" options={destination('Início', 'home')} />
        <Tabs.Protected guard={Boolean(auth)}>
          <Tabs.Screen name="orcamentos" options={destination('Orçamentos', 'file-text')} />
          <Tabs.Screen name="agenda" options={destination('Agenda', 'calendar')} />
          <Tabs.Screen name="catalogo" options={destination('Catálogo', 'layers')} />
          <Tabs.Screen name="mais" options={destination('Mais', 'more-horizontal')} />
          <Tabs.Screen name="sobre" options={destination('Sobre', 'info')} />
          <Tabs.Screen name="contato" options={destination('Contato', 'message-circle')} />
        </Tabs.Protected>
      </Tabs>
    </SelectedCompanyContext.Provider>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: palette.background, borderColor: palette.divider },
  sidebar: { width: 176, paddingTop: space.xl, paddingHorizontal: space.sm },
  scene: { flex: 1 },
  hidden: { display: 'none' },
  item: { minHeight: touchSize, borderRadius: corners.control },
  icon: { width: 38, height: 30, borderRadius: corners.pill, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { backgroundColor: palette.accentSurface },
  label: { fontSize: 11, fontWeight: '600', color: palette.muted, textAlign: 'center' },
  activeLabel: { color: palette.accent },
});
