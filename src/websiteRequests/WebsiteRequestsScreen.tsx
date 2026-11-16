import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import type { Company } from '../catalog/model';
import { Screen } from '../components/Screen';
import { confirmAction } from '../components/confirmAction';
import { WorkspaceList } from '../components/WorkspaceControls';
import { useQuoteFeed } from '../dashboard/useQuoteFeed';
import { EmptyState, FilterChips, ListItem, LoadingState, PrimaryButton, SearchBar, SecondaryButton, StatusBadge } from '../design-system';
import { space, type } from '../design-system/tokens';
import { openQuote } from '../navigation/routes';
import { proposalDate } from '../proposals/repository';

const events = {
  casamento: 'Casamento ou noivado',
  aniversario: 'Aniversário',
  cha: 'Chá ou comemoração familiar',
  corporativo: 'Evento corporativo',
  outro: 'Outro evento',
};
const services = {
  cenario: 'Painel e cenário',
  baloes: 'Balões',
  flores: 'Arranjos florais',
  mesas: 'Decoração das mesas',
  completa: 'Decoração completa',
};
const statuses = { new: 'Nova', reviewing: 'Em análise', closed: 'Encerrada' };
const nextStatus = { new: 'reviewing', reviewing: 'closed', closed: null } as const;
const statusFilters = [{ id: '', label: 'Todas' }, ...Object.entries(statuses).map(([id, label]) => ({ id, label }))];
const pageSize = 20;
const summaryFields = 'id,customer_name,event_type,city,status,created_at';

type RequestSummary = {
  id: string;
  customer_name: string;
  event_type: keyof typeof events;
  city: string;
  status: keyof typeof statuses;
  created_at: string;
};

type WebsiteRequest = RequestSummary & {
  customer_email: string;
  services: (keyof typeof services)[];
  catalog_items?: { id: string; name: string; quantity: number; unit: string | null }[] | null;
  event_date: string | null;
  details: string;
  client_id?: string | null;
  contact_details?: { venue?: string; guests?: number | null; whatsapp?: string; inspiration?: string; notes?: string } | null;
  linkedQuote?: string;
  conversionAvailable?: boolean;
  legacyClaimAvailable?: boolean;
  activity?: { id: number; status: keyof typeof statuses; happened_at: string }[];
};

function WebsiteRequestDetail({ client, companyId, requestId, onBack }: {
  client: SupabaseClient; companyId: string; requestId: string; onBack: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState<string>();
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimLink, setClaimLink] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updatedStatus, setUpdatedStatus] = useState<'reviewing' | 'closed'>();
  const load = useCallback(async (connection: SupabaseClient, scope: string) => {
    const fields = summaryFields + ',customer_email,services,event_date,details';
    const query = (columns: string) => connection.from('website_requests')
      .select(columns).eq('company_id', scope).eq('id', requestId).maybeSingle();
    let { data, error } = await query(fields + ',catalog_items,contact_details,client_id');
    if (error?.code === '42703') ({ data, error } = await query(fields + ',catalog_items,contact_details'));
    if (error?.code === '42703') ({ data, error } = await query(fields + ',catalog_items'));
    if (error?.code === '42703') ({ data, error } = await query(fields));
    if (error) throw error;
    if (!data) return [];
    const request = data as unknown as WebsiteRequest;
    const link = await connection.from('quotes').select('id').eq('company_id', scope)
      .eq('source_request_id', requestId).maybeSingle<{ id: string }>();
    if (link.error?.code === '42703') return [request];
    if (link.error) throw link.error;
    const historyQuery = connection.from('website_request_history').select('id,status,happened_at')
      .eq('company_id', scope).eq('request_id', requestId).order('id', { ascending: false }).limit(10)
      .returns<NonNullable<WebsiteRequest['activity']>>();
    const [history, claim] = await Promise.all([historyQuery, Platform.OS === 'web'
      ? connection.rpc('can_issue_customer_claim', { p_request: requestId }) : null]);
    if (history.error) throw history.error;
    return [{ ...request, linkedQuote: link.data?.id, conversionAvailable: true, activity: history.data,
      legacyClaimAvailable: !claim?.error && claim?.data === true }];
  }, [requestId]);
  const feed = useQuoteFeed(client, companyId, load);
  const selected = feed.rows[0];
  const status = selected?.status === 'closed' ? 'closed' : updatedStatus ?? selected?.status;
  const next = status && nextStatus[status];
  const linkedQuote = converted ?? selected?.linkedQuote;

  async function issueClaim() {
    if (claimBusy) return;
    setClaimBusy(true);
    setUpdateError('');
    setClaimLink('');
    try {
      const { data, error } = await client.rpc('issue_customer_request_claim', { p_request: requestId });
      if (error || typeof data !== 'string' || !/^[a-f0-9]{64}$/.test(data)) throw new Error();
      setClaimLink(globalThis.location.origin + '/login#pedido=' + data);
    } catch {
      setUpdateError('Não foi possível gerar o link de vínculo. Atualize o pedido e confira as permissões.');
    } finally {
      setClaimBusy(false);
    }
  }

  async function convert() {
    if (converting || updating) return;
    setConverting(true);
    setUpdateError('');
    try {
      const { data, error } = await client.rpc('convert_website_request', { p_request: requestId });
      if (error || typeof data !== 'string') {
        setUpdateError(error?.code === '21000'
          ? 'Há mais de um cliente ativo com este e-mail. Revise os cadastros antes de converter.'
          : error?.code === '23514' && error.message === 'Cliente arquivado'
            ? 'Reative o cadastro do cliente antes de criar o orçamento.'
            : 'Não foi possível criar o orçamento. Confira as permissões e atualize o pedido.');
        return;
      }
      setConverted(data);
      if (status === 'new') setUpdatedStatus('reviewing');
      openQuote(companyId, data);
    } catch {
      setUpdateError('Não foi possível confirmar a criação. Tente novamente para abrir o mesmo orçamento, se ele já foi gravado.');
    } finally {
      setConverting(false);
    }
  }

  async function advance(target: 'reviewing' | 'closed') {
    if (updating || converting) return;
    setUpdating(true);
    setUpdateError('');
    try {
      const { error } = await client.rpc('manage_website_request', {
        p_company: companyId, p_id: requestId, p_status: target,
      });
      if (error) throw error;
      setUpdatedStatus(target);
    } catch {
      setUpdateError('Não foi possível atualizar a solicitação. Atualize a lista e tente novamente.');
    } finally {
      setUpdating(false);
    }
  }

  if (!selected || !status) return <Screen title="Pedido do site" layout="wide">
    {feed.loading ? <LoadingState /> : feed.error ? <EmptyState title="Falha ao consultar o pedido" error
      description={feed.error} action={{ label: 'Tentar novamente', onPress: feed.retry }} />
      : <EmptyState title="Pedido indisponível" />}
    <SecondaryButton label="Voltar à lista" onPress={onBack} />
  </Screen>;

  return <Screen title={selected.customer_name} description={events[selected.event_type]} layout="wide">
    <StatusBadge label={statuses[status]} />
    {!!selected.client_id && <Text style={type.detail}>Cadastro do cliente vinculado</Text>}
    <View style={{ gap: space.xs }}>
      <Text style={type.body} selectable>{selected.customer_email}</Text>
      {!!selected.contact_details?.whatsapp && <Text style={type.body} selectable>WhatsApp {selected.contact_details.whatsapp}</Text>}
      <Text style={type.body}>{selected.city}</Text>
      {!!selected.contact_details?.venue && <Text style={type.body}>{selected.contact_details.venue}</Text>}
      {!!selected.contact_details?.guests && <Text style={type.body}>{selected.contact_details.guests} convidados</Text>}
      <Text style={type.detail}>{selected.event_date
        ? 'Evento em ' + selected.event_date.split('-').reverse().join('/')
        : 'Data do evento a definir'}</Text>
      <Text style={type.detail}>Recebida em {proposalDate(selected.created_at)}</Text>
    </View>
    {!!selected.catalog_items?.length && <View style={{ gap: space.xs }}>
      <Text style={type.section}>Materiais do catálogo</Text>
      {selected.catalog_items.map((item) => <Text key={item.id} style={type.body}>
        {item.name} · {item.quantity.toLocaleString('pt-BR')}{item.unit ? ' ' + item.unit : ''}
      </Text>)}
    </View>}
    <View style={{ gap: space.xs }}>
      <Text style={type.section}>Serviços escolhidos</Text>
      <Text style={type.body}>{selected.services.map((item) => services[item]).join(' · ')}</Text>
    </View>
    {selected.contact_details ? <>
      {!!selected.contact_details.inspiration && <Text style={type.body}>{selected.contact_details.inspiration}</Text>}
      {!!selected.contact_details.notes && <Text style={type.body}>{selected.contact_details.notes}</Text>}
    </> : selected.details !== '' && <Text style={type.body}>{selected.details}</Text>}
    {!!selected.activity?.length && <View style={{ gap: space.xs }}>
      <Text style={type.section}>Histórico da solicitação</Text>
      {selected.activity.map((row) => <Text key={row.id} style={type.detail}>
        {statuses[row.status]} · {proposalDate(row.happened_at)}
      </Text>)}
    </View>}
    {updateError !== '' && <>
      <Text accessibilityRole="alert" style={type.body}>{updateError}</Text>
      <SecondaryButton label="Atualizar pedido" onPress={() => { setUpdateError(''); feed.retry(); }} />
    </>}
    {linkedQuote ? <PrimaryButton label="Abrir orçamento vinculado" onPress={() => openQuote(companyId, linkedQuote)} />
      : selected.conversionAvailable && <>
        <Text style={type.detail}>Itens arquivados ficam no pedido original para revisão.</Text>
        <PrimaryButton label="Criar orçamento" loading={converting} disabled={updating} onPress={() => void convert()} />
      </>}
    {next && <SecondaryButton label={next === 'reviewing' ? 'Iniciar análise' : 'Encerrar solicitação'} disabled={converting}
      loading={updating} onPress={() => void advance(next)} />}
    {selected.legacyClaimAvailable && <View style={{ gap: space.xs }}>
      <Text style={type.section}>Acesso do cliente ao pedido</Text>
      <Text style={type.detail}>Verifique a identidade do cliente e o comprovante do pedido antes de compartilhar o link.</Text>
      <SecondaryButton label={claimLink ? 'Gerar outro link' : 'Gerar link de vínculo'} loading={claimBusy}
        onPress={() => confirmAction('Vincular pedido antigo', 'Confirma que verificou a identidade e o pedido deste cliente?',
          'Gerar link', () => void issueClaim())} />
      {!!claimLink && <Text selectable style={type.body}>{claimLink}</Text>}
      {!!claimLink && <Text style={type.detail}>Link de uso único, válido por 24 horas para o e-mail confirmado deste pedido.</Text>}
    </View>}
    <SecondaryButton label="Voltar à lista" onPress={onBack} disabled={updating || converting} />
  </Screen>;
}

export function WebsiteRequestsScreen({ client, company, requestId, onBack }: {
  client: SupabaseClient; company: Company; requestId?: string; onBack: () => void;
}) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [queryName, setQueryName] = useState('');
  const [selectedId, setSelectedId] = useState(requestId);
  useEffect(() => {
    const timer = setTimeout(() => {
      const name = search.trim();
      if (name !== queryName) {
        setPage(0);
        setQueryName(name);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, queryName]);
  const load = useCallback(async (connection: SupabaseClient, scope: string) => {
    let query = connection.from('website_requests').select(summaryFields).eq('company_id', scope);
    if (filter) query = query.eq('status', filter);
    if (queryName) query = query.ilike('customer_name', '%' + queryName.replace(/[\\%_*]/g, (char) => '\\' + char) + '%');
    const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize).returns<RequestSummary[]>();
    if (error?.code === 'PGRST205') throw new Error('O recebimento de solicitações do site ainda não foi ativado.');
    if (error) throw error;
    return data;
  }, [filter, page, queryName]);
  const feed = useQuoteFeed(client, company.id, load);

  if (selectedId) return <WebsiteRequestDetail key={company.id + ':' + selectedId} client={client}
    companyId={company.id} requestId={selectedId} onBack={() => { setSelectedId(undefined); feed.retry(); }} />;

  return <Screen title="Pedidos do site" description={company.name} layout="wide">
    <SearchBar label="Buscar pedido pelo nome do cliente" placeholder="Nome do cliente" value={search}
      onChangeText={(value) => setSearch(value.slice(0, 100))} />
    <FilterChips label="Situação" options={statusFilters} selected={filter} onSelect={(id) => { setFilter(id); setPage(0); }} />
    {feed.loading ? <LoadingState /> : feed.error ? <EmptyState title="Falha ao consultar os pedidos" description={feed.error} error
      action={{ label: 'Tentar novamente', onPress: feed.retry }} /> : feed.rows.length === 0 ? (
      <EmptyState title={filter || queryName ? 'Nenhum pedido encontrado' : 'Nenhum pedido recebido'}
        description={filter || queryName ? 'Altere a busca ou a situação selecionada.' : 'As solicitações do site aparecerão aqui.'} />
    ) : <WorkspaceList>{feed.rows.slice(0, pageSize).map((request) => <ListItem key={request.id} title={request.customer_name}
      icon="message-circle" detail={events[request.event_type] + ' · ' + request.city}
      trailing={<StatusBadge label={statuses[request.status]} />} onPress={() => setSelectedId(request.id)} />)}</WorkspaceList>}
    {page > 0 && <SecondaryButton label="Página anterior" onPress={() => setPage(page - 1)} />}
    {feed.rows.length > pageSize && <SecondaryButton label="Próxima página" onPress={() => setPage(page + 1)} />}
    <SecondaryButton label="Voltar" onPress={onBack} />
  </Screen>;
}
