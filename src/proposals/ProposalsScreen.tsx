import { useFocusEffect } from 'expo-router';
import type { SupabaseClient } from '@supabase/supabase-js';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Share, Text, View } from 'react-native';

import { Chip, Field, catalogStyles as styles } from '../catalog/controls';
import { listCompanies } from '../catalog/repository';
import type { Company } from '../catalog/model';
import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { ConfirmDialog, FilterChips, ListItem, LoadingState, SecondaryButton, StatusBadge } from '../design-system';
import { brl } from '../calculator/finance';
import { colors } from '../theme';
import { decisions, listProposals, proposalDate as date, type ProposalRow as Row } from './repository';
import { loadQuoteDetails, loadQuote, imageUrl, type Quote } from '../quotes/repository';

type Brand = { display_name: string; accent: string; whatsapp: string };
type Target = { company: string; quote: string };
const pageSize = 20;

function publicLink(token: string) {
  try {
    const url = new URL(process.env.EXPO_PUBLIC_PROPOSAL_PAGE_URL ?? '');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && __DEV__ &&
      ['localhost', '127.0.0.1'].includes(url.hostname))) return '';
    if (url.username || url.password || url.search) return '';
    url.hash = token;
    return url.href;
  } catch { return ''; }
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  const code = typeof error === 'object' && error && 'code' in error ? error.code : '';
  if (code === '23514') return 'O orçamento precisa estar pronto para revisão, com cálculo, decoração e pagamento. Confira também a identidade comercial.';
  if (code === '42501') return 'Sua conta não tem acesso a esta proposta.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

function CompanyProposals({ client, company, quote, back }: {
  client: SupabaseClient; company: Company; quote?: string; back: () => void;
}) {
  const [brand, setBrand] = useState<Brand>({ display_name: company.name, accent: colors.blueGray, whatsapp: '' });
  const [brandOpen, setBrandOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const [revision, setRevision] = useState(0);
  const [offset, setOffset] = useState(0);
  const [latest, setLatest] = useState<Row>();
  const [unread, setUnread] = useState(!quote);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<{ token: string; id: string }>();
  const [confirmation, setConfirmation] = useState<'issue' | Row>();
  const [tab, setTab] = useState('proposal');
  const [details, setDetails] = useState<{ quote: Quote; images: string[] }>();
  const [detailsError, setDetailsError] = useState('');
  const [sourceStatus, setSourceStatus] = useState<Quote['status']>();
  const link = issued ? publicLink(issued.token) : '';

  useFocusEffect(useCallback(() => {
    if (!quote) return;
    let active = true;
    setSourceStatus(undefined);
    void loadQuote(client, company.id, quote, false).then(({ quote: source }) => {
      if (active) setSourceStatus(source.status);
    }).catch((cause) => { if (active) setError(errorText(cause)); });
    return () => { active = false; };
  }, [client, company.id, quote]));

  useFocusEffect(useCallback(() => {
    if (!quote || tab !== 'details') return;
    let active = true;
    setDetails(undefined);
    setDetailsError('');
    void loadQuoteDetails(client, company.id, quote, false).then(async (data) => {
      const images = await Promise.all(data.images.map(({ path }) => imageUrl(client, path).catch(() => '')));
      if (active) setDetails({ quote: data.quote, images });
    }).catch((cause) => { if (active) setDetailsError(errorText(cause)); });
    return () => { active = false; };
  }, [client, company.id, quote, tab]));

  useFocusEffect(useCallback(() => {
    let active = true;
    void client.from('proposal_branding').select('display_name,accent,whatsapp').eq('company_id', company.id)
      .maybeSingle<Brand>().then(({ data, error: cause }) => {
        if (!active) return;
        if (cause) setError(errorText(cause));
        if (data) setBrand({ ...data, whatsapp: data.whatsapp ?? '' });
      });
    return () => { active = false; };
  }, [client, company.id]));

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const data = await listProposals(client, company.id, { quote, unread, offset, responses: !quote, limit: pageSize + 1 });
        if (!active) return;
        setRows(data);
        if (quote && offset === 0) setLatest(data[0]);
        setCheckedAt(Date.now());
      } catch (cause) {
        if (active) setError(errorText(cause));
      } finally {
        refreshing = false;
        if (active) setLoading(false);
      }
    }
    void refresh();
    const timer = offset === 0 ? setInterval(() => void refresh(), 20000) : undefined;
    return () => { active = false; clearInterval(timer); };
  }, [client, company.id, quote, revision, offset, unread]));

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await task(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function saveBrand() {
    const whatsapp = brand.whatsapp.replace(/[+\s().-]/g, '');
    if (!brand.display_name.trim() || !/^#[\da-f]{6}$/i.test(brand.accent) || !/^[1-9]\d{9,14}$/.test(whatsapp)) {
      throw new Error('Informe o nome comercial, a cor hexadecimal e o WhatsApp com código do país e DDD.');
    }
    const { error: cause } = await client.rpc('save_proposal_brand', {
      p_company: company.id, p_name: brand.display_name.trim(), p_accent: brand.accent, p_whatsapp: whatsapp,
    });
    if (cause) throw cause;
    setBrandOpen(false);
  }

  async function issue() {
    if (!quote || !publicLink('')) throw new Error('Configure a URL da página pública antes de emitir.');
    const { data, error: cause } = await client.rpc('issue_proposal', { p_company: company.id, p_quote: quote });
    if (cause) throw cause;
    if (!data || typeof data.token !== 'string' || typeof data.id !== 'string') throw new Error('Não foi possível confirmar a emissão.');
    setIssued(data);
    setOffset(0);
    setRevision((value) => value + 1);
  }

  async function downloadPdf() {
    if (!issued) return;
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const response = await fetch(base?.replace(/\/$/, '') + '/functions/v1/public-proposal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pdf', token: issued.token }),
    });
    if (!response.ok) throw new Error('Não foi possível gerar o PDF. Confira a validade do link e tente novamente.');
    const filename = 'proposta-' + issued.id + '.pdf';
    if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento de PDF indisponível neste dispositivo.');
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    try {
      file.write(new Uint8Array(await response.arrayBuffer()));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } finally { file.delete(); }
  }

  function manage(row: Row, action: 'read' | 'revoke') {
    void run(async () => {
      const { error: cause } = await client.rpc('manage_proposal', { p_company: company.id, p_id: row.id, p_action: action });
      if (cause) throw cause;
      if (action === 'revoke' && issued?.id === row.id) setIssued(undefined);
      setRevision((value) => value + 1);
    });
  }

  return <Screen title={quote ? 'Proposta comercial' : 'Respostas de propostas'} description={company.name}>
    {quote && <FilterChips label="Seção da proposta" options={[
      { id: 'proposal', label: 'Proposta' }, { id: 'details', label: 'Detalhes' }, { id: 'history', label: 'Histórico' },
    ]} selected={tab} onSelect={setTab} />}
    {quote && tab === 'details' && (detailsError ? <Text accessibilityRole="alert" style={styles.error}>{detailsError}</Text>
      : !details ? <LoadingState label="Carregando detalhes…" /> : <>
        <Text style={styles.title}>Dados do orçamento atual</Text>
        <Text style={styles.text}>{details.quote.decoration}</Text>
        <Text style={styles.text}>{details.quote.payment_terms}</Text>
        {details.quote.items.map((item) => <ListItem key={item.id} title={item.name} detail={[item.quantity, item.unit].filter(Boolean).join(' ')} />)}
        {details.images.map((uri, index) => uri
          ? <Image key={uri} source={{ uri }} style={styles.photo} resizeMode="contain" accessibilityLabel={`Referência ${index + 1}`} />
          : <Text key={index} style={styles.text}>Referência indisponível.</Text>)}
      </>)}
    {(!quote || tab === 'proposal') && <>
    <View style={styles.row}>
      <SecondaryButton label={brandOpen ? 'Fechar identidade' : 'Identidade comercial'} icon="edit-3"
        onPress={() => setBrandOpen((current) => !current)} />
    </View>
    {brandOpen && <View style={styles.card}>
      <Field label="Nome comercial" value={brand.display_name} onChangeText={(display_name) => setBrand({ ...brand, display_name })} />
      <Field label="Cor da marca (#RRGGBB)" maxLength={7} value={brand.accent} onChangeText={(accent) => setBrand({ ...brand, accent })} />
      <Field label="WhatsApp com código do país" maxLength={25} value={brand.whatsapp} onChangeText={(whatsapp) => setBrand({ ...brand, whatsapp })} />
      <ActionButton label="Salvar identidade" disabled={busy} onPress={() => void run(saveBrand)} />
    </View>}
    {quote && <>
      {latest && <View style={styles.card}>
        <Text style={styles.title}>{latest.content.customer}</Text>
        <StatusBadge label={latest.decision ? decisions[latest.decision] : 'Aguardando resposta'}
          tone={latest.decision === 'approved' ? 'positive' : latest.decision === 'declined' ? 'error' : 'warning'} />
        <Text style={styles.text}>{latest.content.decoration}</Text>
        {latest.content.total && /^\d+$/.test(latest.content.total) ? <Text style={styles.strong}>{brl(BigInt(latest.content.total))}</Text> : null}
        <Text style={styles.text}>{latest.content.payment}</Text>
      </View>}
      <Text style={styles.text}>A validade de dois dias começa ao emitir o link. Compartilhe-o com o cliente após a emissão.</Text>
      {!publicLink('') ? <Text style={styles.text}>A emissão fica disponível quando a página pública estiver configurada.</Text>
        : sourceStatus === 'ready' ? <ActionButton label="Emitir proposta" disabled={busy || Boolean(confirmation)} onPress={() => setConfirmation('issue')} />
        : sourceStatus ? <Text style={styles.text}>Marque o orçamento como pronto para revisão para emitir a proposta.</Text>
        : !error && <LoadingState label="Consultando estado do orçamento…" />}
      <ConfirmDialog visible={confirmation === 'issue'} title="Emitir nova versão?"
        description="A emissão revoga links anteriores ainda sem resposta." confirmLabel="Confirmar emissão"
        onClose={() => setConfirmation(undefined)} onConfirm={() => { setConfirmation(undefined); void run(issue); }} />
      {link !== '' && <View style={styles.card}>
        <Text style={styles.title}>Link exclusivo</Text>
        <Text selectable style={styles.text}>{link}</Text>
        <Chip label="Abrir proposta" disabled={busy} onPress={() => void run(() => Linking.openURL(link))} />
        <SecondaryButton label="Abrir rascunho de e-mail" disabled={busy} onPress={() => void run(() => Linking.openURL(
          'mailto:?subject=' + encodeURIComponent('Proposta comercial') + '&body=' +
          encodeURIComponent('Olá! Segue o link da proposta comercial: ' + link)))} />
        <ActionButton label="Compartilhar pelo WhatsApp" disabled={busy} onPress={() => void run(() =>
          Linking.openURL('https://wa.me/?text=' + encodeURIComponent('Olá! Segue sua proposta comercial: ' + link)))} />
        {Platform.OS !== 'web' && <Chip label="Mais opções de compartilhamento" disabled={busy}
          onPress={() => void run(async () => { await Share.share({ message: link }); })} />}
        {Platform.OS !== 'web' && <Chip label="Compartilhar PDF" disabled={busy} onPress={() => void run(downloadPdf)} />}
        <Text style={styles.text}>Copie o link antes de sair desta tela. Para gerar outro link, emita uma nova versão.</Text>
      </View>}
    </>}
    </>}
    {(!quote || tab === 'history') && <>
    {!quote && <View style={styles.row}>
      <Chip label="Novas" active={unread} onPress={() => { setUnread(true); setOffset(0); }} />
      <Chip label="Todas" active={!unread} onPress={() => { setUnread(false); setOffset(0); }} />
      <Chip label="Atualizar" onPress={() => { setError(''); setRevision((value) => value + 1); }} />
    </View>}
    {(busy || loading) && <ActivityIndicator accessibilityLabel="Carregando propostas" color={colors.blueGray} />}
    {!loading && rows.length === 0 && <Text style={styles.text}>{quote ? 'Nenhuma versão emitida.' : 'Nenhuma resposta nesta lista.'}</Text>}
    {!loading && rows.slice(0, pageSize).map((row) => <View key={row.id} style={styles.card}>
      <Text style={styles.title}>{row.content.code} · Versão {row.version}</Text>
      <Text style={styles.text}>{row.content.customer} · {row.content.title}</Text>
      <Text style={styles.strong}>{row.decision ? decisions[row.decision] : 'Aguardando resposta'}{row.revoked_at ? ' · Link revogado'
        : Date.parse(row.expires_at) <= checkedAt ? ' · Link expirado' : ''}</Text>
      <Text style={styles.text}>{row.responded_at ? 'Respondida em ' + date(row.responded_at) : 'Válida até ' + date(row.expires_at)}</Text>
      {row.decision === 'declined' && <Text style={styles.text}>{row.wants_revision ? 'Solicitou nova proposta.' : 'Dispensou nova proposta.'}</Text>}
      {row.decision && !row.notification_read_at && <Chip label="Marcar como lida" disabled={busy} onPress={() => manage(row, 'read')} />}
      {quote && !row.revoked_at && Date.parse(row.expires_at) > checkedAt &&
        (typeof confirmation === 'object' && confirmation.id === row.id ? <>
          <Text style={styles.text}>O cliente perderá o acesso por este endereço.</Text>
          <Chip label="Confirmar revogação" onPress={() => { setConfirmation(undefined); manage(row, 'revoke'); }} />
          <Chip label="Cancelar" onPress={() => setConfirmation(undefined)} />
        </> : <Chip label="Revogar link" disabled={busy || Boolean(confirmation)} onPress={() => setConfirmation(row)} />)}
    </View>)}
    <View style={styles.row}>
      {offset > 0 && <Chip label="Anterior" onPress={() => setOffset(offset - pageSize)} />}
      {rows.length > pageSize && <Chip label="Próxima" onPress={() => setOffset(offset + pageSize)} />}
    </View>
    </>}
    {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Chip label="Voltar" disabled={busy} onPress={back} />
  </Screen>;
}

export function ProposalsScreen({ client, userId, target, back }: {
  client: SupabaseClient; userId: string; target?: Target; back: () => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    void listCompanies(client, userId).then((data) => {
      if (active) setCompanies(data.filter(({ role }) => role !== 'member'));
    }).catch((cause) => { if (active) { setCompanies([]); setError(errorText(cause)); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, userId, retry]));
  const company = companies.find(({ id }) => id === (target?.company ?? selected));
  if (company) return <CompanyProposals client={client} company={company} quote={target?.quote}
    back={target ? back : () => setSelected('')} />;
  return <Screen title="Propostas comerciais">
    {loading ? <ActivityIndicator color={colors.blueGray} /> : error ? <>
      <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      <Chip label="Tentar novamente" onPress={() => { setLoading(true); setError(''); setRetry((value) => value + 1); }} />
    </> : target || companies.length === 0 ? <Text style={styles.text}>Disponível para administradores e proprietários da empresa.</Text>
      : companies.map((entry) => <ActionButton key={entry.id} label={entry.name} onPress={() => setSelected(entry.id)} />)}
  </Screen>;
}
