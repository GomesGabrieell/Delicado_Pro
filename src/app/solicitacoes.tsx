import type { SupabaseClient } from '@supabase/supabase-js';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import type { Company } from '../catalog/model';
import { Screen } from '../components/Screen';
import { WorkspaceList } from '../components/WorkspaceControls';
import { useQuoteFeed } from '../dashboard/useQuoteFeed';
import { EmptyState, FilterChips, ListItem, LoadingState, PrimaryButton, SearchBar, SecondaryButton, StatusBadge } from '../design-system';
import { space, type } from '../design-system/tokens';
import { openQuote, routeId } from '../navigation/routes';
import { useCompanies } from '../navigation/useCompanies';
import { useRouteSession } from '../navigation/useRouteSession';
import { decisions, listProposals, proposalDate, type Decision, type ProposalRow } from '../proposals/repository';
import { loadQuote } from '../quotes/repository';
import { WebsiteRequestsScreen } from '../websiteRequests/WebsiteRequestsScreen';

const situations = [
  { id: '', label: 'Todas' }, { id: 'new', label: 'Novas respostas' }, { id: 'sent', label: 'Proposta enviada' },
  ...Object.entries(decisions).map(([id, label]) => ({ id, label })),
];
function status(row: ProposalRow) {
  if (row.decision) return decisions[row.decision];
  if (row.revoked_at) return 'Link revogado';
  return Date.parse(row.expires_at) <= Date.now() ? 'Link expirado' : 'Proposta enviada';
}

function CommercialDetail({ client, company, id, onBack }: {
  client: SupabaseClient; company: string; id: string; onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback((connection: SupabaseClient, scope: string) =>
    listProposals(connection, scope, { id, limit: 1 }), [id]);
  const feed = useQuoteFeed(client, company, load);
  const entry = feed.rows[0];
  const quoteId = entry?.quote_id;
  const loadSource = useCallback(async (connection: SupabaseClient, scope: string) => {
    if (!quoteId) return [];
    return [(await loadQuote(connection, scope, quoteId, false)).quote];
  }, [quoteId]);
  const source = useQuoteFeed(client, company, loadSource);
  const customerId = source.rows[0]?.client_id;

  async function markRead() {
    if (!entry || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: cause } = await client.rpc('manage_proposal', { p_company: company, p_id: id, p_action: 'read' });
      if (cause) throw cause;
      feed.retry();
    } catch {
      setError('Não foi possível marcar a resposta como lida.');
    } finally {
      setBusy(false);
    }
  }

  return <Screen title={entry?.content.customer ?? 'Detalhe comercial'} description={entry?.content.code}>
    {feed.loading ? <LoadingState /> : feed.error ? <EmptyState title="Falha ao consultar registro" error
      description={feed.error} action={{ label: 'Tentar novamente', onPress: feed.retry }} /> : !entry ? (
      <EmptyState title="Registro indisponível" />
    ) : <>
      <StatusBadge label={status(entry)} tone={entry.decision === 'approved' ? 'positive' : 'neutral'} />
      <Text style={type.section}>{entry.content.title}</Text>
      <Text style={type.detail}>{[entry.content.eventDate?.split('-').reverse().join('/'), entry.content.location].filter(Boolean).join(' · ')}</Text>
      {entry.content.decoration && <Text style={type.body}>{entry.content.decoration}</Text>}
      <View style={{ gap: space.xs }}>
        <Text accessibilityRole="header" style={type.section}>Histórico registrado</Text>
        <Text style={type.detail}>Versão {entry.version} emitida em {proposalDate(entry.sent_at)}</Text>
        {entry.responded_at && <Text style={type.detail}>{status(entry)} em {proposalDate(entry.responded_at)}</Text>}
        {entry.wants_revision && <Text style={type.detail}>O cliente solicitou nova proposta.</Text>}
        {entry.revoked_at && <Text style={type.detail}>Link revogado em {proposalDate(entry.revoked_at)}</Text>}
      </View>
      <PrimaryButton label="Abrir orçamento e referências" onPress={() => openQuote(company, entry.quote_id)} />
      <SecondaryButton label="Ver versões da proposta" onPress={() => router.push({ pathname: '/propostas', params: { company, quote: entry.quote_id } })} />
      {customerId && <SecondaryButton label="Criar orçamento para este cliente" onPress={() =>
        router.push({ pathname: '/orcamento', params: { company, clientId: customerId } })} />}
      {entry.responded_at && !entry.notification_read_at && (
        <SecondaryButton label="Marcar resposta como lida" loading={busy} onPress={() => void markRead()} />
      )}
      {error !== '' && <Text accessibilityRole="alert" style={type.body}>{error}</Text>}
    </>}
    <SecondaryButton label="Voltar à lista" onPress={onBack} />
  </Screen>;
}

function CommercialList({ client, company, initialId, onBack }: {
  client: SupabaseClient; company: Company; initialId?: string; onBack?: () => void;
}) {
  const [selected, setSelected] = useState(initialId);
  const [showWebsiteRequests, setShowWebsiteRequests] = useState(false);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const load = useCallback((connection: SupabaseClient, scope: string) => listProposals(connection, scope, {
    decision: filter && filter !== 'new' ? filter as Decision | 'sent' : undefined,
    unread: filter === 'new', responses: filter === 'new', search, offset: page * 20,
  }), [filter, search, page]);
  const feed = useQuoteFeed(client, company.id, load);

  if (showWebsiteRequests && company.role === 'owner') {
    return <WebsiteRequestsScreen client={client} company={company} onBack={() => setShowWebsiteRequests(false)} />;
  }
  if (selected) return <CommercialDetail client={client} company={company.id} id={selected}
    onBack={() => { setSelected(undefined); feed.retry(); }} />;
  return <Screen title="Solicitações e respostas" description={company.name} layout="wide">
    {company.role === 'owner' && <PrimaryButton label="Pedidos do site" onPress={() => setShowWebsiteRequests(true)} />}
    <SearchBar label="Buscar por cliente ou proposta" placeholder="Buscar por cliente ou proposta" value={search}
      onChangeText={(text) => { setSearch(text); setPage(0); }} />
    <FilterChips label="Situação" options={situations} selected={filter} onSelect={(id) => { setFilter(id); setPage(0); }} />
    {feed.loading ? <LoadingState /> : feed.error ? <EmptyState title="Falha ao carregar" error description={feed.error}
      action={{ label: 'Tentar novamente', onPress: feed.retry }} /> : feed.rows.length === 0 ? (
      <EmptyState title="Nenhum registro encontrado" />
    ) : <WorkspaceList>{feed.rows.slice(0, 20).map((row) => <ListItem key={row.id} title={row.content.customer} icon="message-circle"
      detail={`${row.content.title} · ${proposalDate(row.responded_at ?? row.sent_at)}`}
      trailing={<StatusBadge label={row.responded_at && !row.notification_read_at ? `Nova resposta · ${status(row)}` : status(row)} />}
      onPress={() => setSelected(row.id)} />)}</WorkspaceList>}
    {page > 0 && <SecondaryButton label="Página anterior" onPress={() => setPage(page - 1)} />}
    {feed.rows.length > 20 && <SecondaryButton label="Próxima página" onPress={() => setPage(page + 1)} />}
    {onBack && <SecondaryButton label="Trocar empresa" onPress={onBack} />}
  </Screen>;
}

function Workspace({ client, userId, target, initialId, websiteOnly }: {
  client: SupabaseClient; userId: string; target?: string; initialId?: string; websiteOnly: boolean;
}) {
  const { companies, loading, error, retry } = useCompanies(client, userId);
  const [selected, setSelected] = useState(target);
  const allowed = companies.filter(({ role }) => websiteOnly ? role === 'owner' : role !== 'member');
  const company = allowed.find(({ id }) => id === selected);
  if (company && !error && websiteOnly) return <WebsiteRequestsScreen key={company.id} client={client}
    company={company} requestId={initialId} onBack={() => router.canGoBack() ? router.back() : router.replace('/orcamentos')} />;
  if (company && !error) return <CommercialList key={company.id} client={client} company={company}
    initialId={company.id === target ? initialId : undefined} onBack={() => setSelected(undefined)} />;
  return <Screen title={websiteOnly ? 'Pedidos do site' : 'Solicitações e respostas'}>
    {loading ? <LoadingState /> : error ? <EmptyState title="Falha ao consultar empresas" description={error} error
      action={{ label: 'Tentar novamente', onPress: retry }} /> : allowed.length === 0 ? (
      <EmptyState title="Acesso indisponível" description="Consulte as permissões do seu vínculo com a empresa." />
    ) : <WorkspaceList>{allowed.map((row) => <ListItem key={row.id} title={row.name} icon="briefcase"
      onPress={() => setSelected(row.id)} />)}</WorkspaceList>}
  </Screen>;
}

export default function CommercialRequests() {
  const auth = useRouteSession();
  const params = useLocalSearchParams();
  const websiteOnly = params.origem === 'site';
  const company = routeId(params.company);
  return auth && <Workspace key={`${company ?? ''}:${websiteOnly}`} client={auth.client} userId={auth.user.id}
    target={company} initialId={routeId(websiteOnly ? params.pedido : params.response)} websiteOnly={websiteOnly} />;
}
