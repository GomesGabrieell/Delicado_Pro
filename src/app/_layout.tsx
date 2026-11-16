import { Stack } from 'expo-router';
import { ThemeProvider, DefaultTheme } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useState } from 'react';

import { useSession } from '../auth/useSession';
import { supabase } from '../services/supabase';
import { colors } from '../theme';
import { SessionContext } from '../navigation/useRouteSession';
import { palette } from '../design-system/tokens';
import { SelectedCompanyContext } from '../navigation/useCompanies';

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: palette.accent, background: palette.canvas,
    card: palette.background, text: palette.text, border: palette.divider },
};

export default function Layout() {
  const { loading, session } = useSession(supabase);
  const [selected, setSelected] = useState({ userId: '', companyId: '' });
  const userId = session?.user.id ?? '';
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.offWhite }}>
    <ActivityIndicator accessibilityLabel="Verificando sessão" color={colors.blueGray} />
  </View>;
  return <ThemeProvider value={theme}>
    <SessionContext.Provider value={session}>
    <SelectedCompanyContext.Provider value={{ companyId: selected.userId === userId ? selected.companyId : '',
      selectCompany: (companyId) => setSelected({ userId, companyId }) }}>
    <StatusBar style="dark" />
    <Stack key={session?.user.id ?? 'guest'} screenOptions={{ headerTintColor: palette.accent }}>
      <Stack.Screen name="(principal)" options={{ title: 'Delicado Pro', headerShown: false }} />
      <Stack.Protected guard={Boolean(supabase) && !session} redirectTo="/">
        <Stack.Screen name="entrar" options={{ title: 'Delicado Pro' }} />
      </Stack.Protected>
      <Stack.Screen name="admin/index" options={{ title: 'Área da empresa', headerShown: false }} />
      <Stack.Screen name="admin/[module]" options={{ title: 'Área da empresa', headerShown: false }} />
      <Stack.Protected guard={Boolean(session)} redirectTo="/">
        <Stack.Screen name="design-system" options={{ title: 'Design System', headerShown: false }} />
        <Stack.Screen name="calculadora" options={{ title: 'Calculadora' }} />
        <Stack.Screen name="orcamento" options={{ title: 'Orçamentos' }} />
        <Stack.Screen name="clientes" options={{ title: 'Clientes' }} />
        <Stack.Screen name="propostas" options={{ title: 'Propostas' }} />
        <Stack.Screen name="solicitacoes" options={{ title: 'Solicitações' }} />
        <Stack.Screen name="perfil" options={{ title: 'Minha conta' }} />
      </Stack.Protected>
    </Stack>
    </SelectedCompanyContext.Provider>
    </SessionContext.Provider>
  </ThemeProvider>;
}
