import type { SupabaseClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { brl } from '../calculator/finance';
import type { Company } from '../catalog/model';
import { CompanyPicker } from '../components/WorkspaceControls';
import { useQuoteFeed } from '../dashboard/useQuoteFeed';
import { AppHeader, EmptyState, IconButton, ListItem, LoadingState, PrimaryButton, SecondaryButton, StatusBadge } from '../design-system';
import { cardElevation, corners, palette, space, type } from '../design-system/tokens';
import { openQuote } from '../navigation/routes';
import { useCompanies } from '../navigation/useCompanies';
import { decisions, listProposals, proposalDate } from '../proposals/repository';
import { countQuotesByStatus, latestQuoteFinancial, listPendingQuotes, listUpcomingEvents, statuses } from '../quotes/repository';

function Frame({ title, active, children }: PropsWithChildren<{ title: string; active?: boolean }>) {
  return <SafeAreaView style={styles.shell} edges={active ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}>
    <AppHeader title={active ? 'Delicado Pro' : title} subtitle={active && title !== 'Delicado Pro' ? title : undefined}
      action={active ? <IconButton label="Minha conta" icon="user" onPress={() => router.push('/perfil')} /> : undefined} />
    <ScrollView contentContainerStyle={styles.scroll}><View style={styles.content}>{children}</View></ScrollView>
  </SafeAreaView>;
}

export function SetupDashboard() {
  return <Frame title="Delicado Pro">
    <EmptyState title="Conexão indisponível"
      description="A conexão com o Supabase precisa ser configurada para acessar a área de trabalho." />
  </Frame>;
}

const loadEvents = (client: SupabaseClient, company: string) => listUpcomingEvents(client, company, 3);
const loadResponses = (client: SupabaseClient, company: string) => listProposals(client, company, { responses: true, limit: 3 });
const dateLabel = (date: string | null) => date?.split('-').reverse().join('/');

function Feed<T>({ feed, empty, render }: { feed: ReturnType<typeof useQuoteFeed<T>>; empty: string; render: (row: T) => React.ReactNode }) {
  if (feed.loading) return <LoadingState />;
  if (feed.error) return <EmptyState title="Não foi possível carregar" description={feed.error} error
    action={{ label: 'Tentar novamente', onPress: feed.retry }} />;
  return feed.rows.length ? <View>{feed.rows.map(render)}</View> : <Text style={type.detail}>{empty}</Text>;
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}><Text accessibilityRole="header" style={type.section}>{title}</Text>{children}</View>;
}

function Responses({ client, company }: { client: SupabaseClient; company: string }) {
  const feed = useQuoteFeed(client, company, loadResponses);
  return <Section title="Retornos comerciais recentes">
    <Feed feed={feed} empty="Nenhuma resposta de cliente registrada." render={(row) => <ListItem key={row.id}
      title={row.content.customer} detail={row.responded_at ? proposalDate(row.responded_at) : undefined} icon="message-circle"
      trailing={<StatusBadge label={row.notification_read_at ? (row.decision ? decisions[row.decision] : 'Respondida') : 'Nova resposta'} />}
      onPress={() => router.push({ pathname: '/solicitacoes', params: { company, response: row.id } })} />} />
    <SecondaryButton label="Ver solicitações e respostas" onPress={() => router.push({ pathname: '/solicitacoes', params: { company } })} />
  </Section>;
}

function Financial({ client, company }: { client: SupabaseClient; company: string }) {
  const feed = useQuoteFeed(client, company, latestQuoteFinancial);
  return <Section title="Último cálculo registrado">
    <Feed feed={feed} empty="Nenhum cálculo financeiro registrado." render={({ quote_id, snapshot }) => {
      const amount = /^\u002d?\d+$/;
      const valid = [snapshot.sale, snapshot.totalCost, snapshot.profit].every((value) => typeof value === 'string' && amount.test(value));
      return <ListItem key={quote_id} icon="dollar-sign" title={valid ? `Preço de venda · ${brl(BigInt(snapshot.sale))}` : 'Cálculo registrado'}
        detail={valid ? `Custo ${brl(BigInt(snapshot.totalCost))} · Lucro ${brl(BigInt(snapshot.profit))}` : undefined}
        onPress={() => openQuote(company, quote_id)} />;
    }} />
  </Section>;
}

function Overview({ client, company, wide }: { client: SupabaseClient; company: Company; wide: boolean }) {
  const events = useQuoteFeed(client, company.id, loadEvents);
  const latest = useQuoteFeed(client, company.id, listPendingQuotes);
  const summary = useQuoteFeed(client, company.id, countQuotesByStatus);
  const quoteList = () => router.navigate({ pathname: '/orcamentos', params: { filtro: 'pendentes', visita: String(Date.now()) } });
  return <View style={[styles.blocks, wide && styles.columns]}>
    <View style={styles.column}>
      <Section title="Próximos eventos">
        <Feed feed={events} empty="Nenhum orçamento ativo com data próxima." render={(row) => <ListItem key={row.id}
          icon="calendar" title={row.title} detail={[dateLabel(row.event_date), row.location].filter(Boolean).join(' · ')}
          trailing={<StatusBadge label={statuses[row.status]} />} onPress={() => openQuote(company.id, row.id)} />} />
      </Section>
      {company.role !== 'member' && <Responses client={client} company={company.id} />}
    </View>
    <View style={styles.column}>
      <Section title="Resumo de orçamentos">
        <Feed feed={summary} empty="Nenhum orçamento para resumir." render={({ status, count }) => <ListItem key={status}
          title={statuses[status]} trailing={<StatusBadge label={String(count)} />} />} />
        <Feed feed={latest} empty="Nenhum orçamento pendente." render={(row) => <ListItem key={row.id}
          title={row.title} detail={`${row.code} · ${statuses[row.status]}`} icon="file-text" onPress={() => openQuote(company.id, row.id)} />} />
        <SecondaryButton label="Ver orçamentos pendentes" onPress={quoteList} />
      </Section>
      {company.role !== 'member' && <Financial client={client} company={company.id} />}
    </View>
  </View>;
}

export function Dashboard({ client, userId }: { client: SupabaseClient; userId: string }) {
  const { width, fontScale } = useWindowDimensions();
  const { company, companies, error, loading, retry, selectCompany } = useCompanies(client, userId);
  const hour = Number(new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(new Date()));
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return <Frame title={company?.name ?? 'Delicado Pro'} active>
    <View style={styles.intro}>
      <View pointerEvents="none" style={styles.glow} />
      <View pointerEvents="none" style={[styles.glow, styles.innerGlow]} />
      <View style={styles.heroCopy}>
        <Text style={styles.date}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'America/Sao_Paulo' }).format(new Date())}</Text>
        <Text accessibilityRole="header" style={styles.greeting}>{greeting}</Text>
        {company && !error && <View style={styles.heroAction}>
          <PrimaryButton label="Novo orçamento" icon="plus" onPress={() => router.push({ pathname: '/orcamento', params: { company: company.id, novo: '1' } })} />
        </View>}
      </View>
    </View>
    {company && !error && companies.length > 1 && <CompanyPicker company={company} companies={companies} onSelect={selectCompany} />}
    {company && !error ? <>
      <View accessibilityLabel="Acessos rápidos" style={styles.actions}>
        <SecondaryButton label="Agenda" icon="calendar" onPress={() => router.navigate('/agenda')} />
        <SecondaryButton label="Catálogo" icon="layers" onPress={() => router.navigate('/catalogo')} />
        <SecondaryButton label="Clientes" icon="users" onPress={() => router.push({ pathname: '/clientes', params: { company: company.id } })} />
      </View>
      <Overview key={company.id} client={client} company={company} wide={width >= 840 && fontScale < 1.25} />
    </> : loading ? <LoadingState label="Carregando seu acesso…" /> : error ? <EmptyState title="Acesso indisponível" description={error} error
      action={{ label: 'Tentar novamente', onPress: retry }} /> : <EmptyState title="Conta de cliente"
      description="Acesse o Portal do Cliente no site para acompanhar suas solicitações e propostas." icon="user" />}
  </Frame>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: palette.canvas },
  scroll: { padding: space.md, paddingBottom: space.xl },
  content: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: space.lg },
  intro: { minHeight: 180, justifyContent: 'center', backgroundColor: palette.hero, borderRadius: corners.overlay, padding: space.lg, overflow: 'hidden' },
  glow: { position: 'absolute', width: 320, height: 320, right: -140, top: -100, borderRadius: corners.pill, backgroundColor: palette.heroGlow },
  innerGlow: { width: 224, height: 224, right: -90, top: -46, backgroundColor: palette.heroGlowStrong },
  heroCopy: { gap: space.xs, alignItems: 'flex-start' },
  heroAction: { marginTop: space.xs },
  date: { ...type.detail, color: palette.onHero },
  greeting: { ...type.title, color: palette.background },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  blocks: { gap: space.lg },
  columns: { flexDirection: 'row' },
  column: { flex: 1, minWidth: 0, gap: space.lg },
  section: { ...cardElevation, gap: space.sm, backgroundColor: palette.background, padding: space.md, borderRadius: corners.surface },
});
