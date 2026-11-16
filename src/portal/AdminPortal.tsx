import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import Agenda from '../app/(principal)/agenda';
import Catalog from '../app/(principal)/catalogo';
import Quotes from '../app/(principal)/orcamentos';
import Clients from '../app/clientes';
import Proposals from '../app/propostas';
import { Screen } from '../components/Screen';
import { CompanyPicker } from '../components/WorkspaceControls';
import { EmptyState, LoadingState, SecondaryButton } from '../design-system';
import { palette, space, type } from '../design-system/tokens';
import { useCompanies } from '../navigation/useCompanies';
import { useRouteSession } from '../navigation/useRouteSession';
import { Dashboard } from '../screens/Dashboard';
import { WebsiteRequestsScreen } from '../websiteRequests/WebsiteRequestsScreen';
import { TeamScreen } from './CompanyAdmin';

const modules = [
  ['inicio', 'Painel'], ['solicitacoes', 'Solicitações'], ['orcamentos', 'Orçamentos'],
  ['clientes', 'Clientes'], ['agenda', 'Agenda'], ['catalogo', 'Catálogo'],
  ['propostas', 'Propostas'], ['equipe', 'Equipe'],
] as const;
type Module = typeof modules[number][0];

function BrowserLogin() {
  useEffect(() => { globalThis.location.replace('/login'); }, []);
  return <Screen title="Portal de acesso"><LoadingState label="Abrindo o login…" /></Screen>;
}

function Workspace({ client, user, module }: { client: SupabaseClient; user: User; module: Module }) {
  const { width } = useWindowDimensions();
  const sidebar = width >= 1024;
  const { companies, company, loading, error, retry, selectCompany } = useCompanies(client, user.id);
  const [showMenu, setShowMenu] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  if (error) return <Screen title="Área da empresa"><EmptyState title="Não foi possível verificar os vínculos" error
    action={{ label: 'Tentar novamente', onPress: retry }} /></Screen>;
  if (!company) return <Screen title="Área da empresa">
    {loading ? <LoadingState /> : <EmptyState title="Sua conta ainda não tem vínculo ativo"
      description="Peça um convite à empresa para acessar a gestão."
      action={{ label: 'Abrir Portal do Cliente', onPress: () => globalThis.location.assign('/cliente') }} />}
  </Screen>;
  const allowed = (id: Module) => id === 'solicitacoes' ? company.role === 'owner'
    : !['propostas', 'equipe'].includes(id) || company.role !== 'member';
  let content;
  if (!allowed(module)) {
    content = <Screen title="Acesso indisponível"><EmptyState title="Seu vínculo não permite abrir este módulo" /></Screen>;
  } else switch (module) {
    case 'solicitacoes':
      content = <WebsiteRequestsScreen client={client} company={company} onBack={() => router.replace('/admin' as Href)} />;
      break;
    case 'orcamentos': content = <Quotes />; break;
    case 'clientes': content = <Clients />; break;
    case 'agenda': content = <Agenda />; break;
    case 'catalogo': content = <Catalog />; break;
    case 'propostas': content = <Proposals />; break;
    case 'equipe': content = <TeamScreen client={client} company={company} userId={user.id} />; break;
    default: content = <Dashboard client={client} userId={user.id} />;
  }
  const navigation = <ScrollView style={sidebar ? styles.sidebar : styles.menu} contentContainerStyle={styles.links}>
    <Text style={type.section}>Delicado Pro</Text>
    <Text style={type.detail}>Área da empresa</Text>
    <CompanyPicker company={company} companies={companies} onSelect={(id) => { selectCompany(id); setShowMenu(false); }} />
    {modules.filter(([id]) => allowed(id)).map(([id, label]) => <SecondaryButton key={id}
      label={id === module ? label + ' · atual' : label} onPress={() => {
        setShowMenu(false);
        router.replace((id === 'inicio' ? '/admin' : '/admin/' + id) as Href);
      }} />)}
    <SecondaryButton label="Portal do Cliente" onPress={() => globalThis.location.assign('/cliente')} />
    <SecondaryButton label="Sair" onPress={() => void client.auth.signOut({ scope: 'local' })
      .then(({ error: cause }) => setSignOutError(Boolean(cause))).catch(() => setSignOutError(true))} />
    {signOutError && <Text accessibilityRole="alert" style={type.body}>Não foi possível encerrar a sessão.</Text>}
  </ScrollView>;
  return <View style={[styles.shell, sidebar && styles.wide]}>
    {sidebar ? navigation : <View style={styles.top}>
      <SecondaryButton label={showMenu ? 'Fechar menu' : 'Abrir menu'} onPress={() => setShowMenu((open) => !open)} />
      <Text style={type.detail}>{company.name}</Text>
    </View>}
    {!sidebar && showMenu && navigation}
    <View key={company.id + ':' + module} style={styles.content}>{content}</View>
  </View>;
}

export function AdminPortal() {
  const auth = useRouteSession();
  const params = useLocalSearchParams();
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  if (!auth) return <BrowserLogin />;
  const module = modules.find(([id]) => id === params.module)?.[0] ?? 'inicio';
  return <Workspace client={auth.client} user={auth.user} module={module} />;
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0, backgroundColor: palette.canvas },
  wide: { flexDirection: 'row' },
  sidebar: { flexGrow: 0, width: 242, backgroundColor: palette.background, borderRightWidth: 1, borderColor: palette.divider },
  menu: { flexGrow: 0, maxHeight: 340, backgroundColor: palette.background },
  links: { padding: space.md, gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, backgroundColor: palette.background },
  content: { flex: 1, minWidth: 0, minHeight: 0 },
});
