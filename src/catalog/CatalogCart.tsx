import Feather from '@expo/vector-icons/Feather';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, FormField, IconButton, ListItem, LoadingState, PrimaryButton, SearchBar, StatusBadge } from '../design-system';
import { corners, iconSize, palette, space } from '../design-system/tokens';
import { createQuoteFromCalculator, findClients, loadQuote, quoteError, saveQuote, type QuoteClient } from '../quotes/repository';
import { catalogStyles as styles, Chip } from './controls';
import { decimalValue, type Item } from './model';
import { getPhotoUrl } from './repository';

export type CartEntry = { item: Item; quantity: string };

function CartThumbnail({ client, path, name }: { client: SupabaseClient; path: string | null; name: string }) {
  const [uri, setUri] = useState<string>();

  useEffect(() => {
    if (!path) return;
    let active = true;
    void getPhotoUrl(client, path).then((url) => {
      if (active) setUri(url);
    }).catch(() => {
      if (active) setUri(undefined);
    });
    return () => { active = false; };
  }, [client, path]);

  return <View style={cartStyles.thumbnail}>
    {uri ? <Image source={{ uri }} accessibilityLabel={`Foto de ${name}`} accessible
      resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setUri(undefined)} />
      : <Feather name="package" size={iconSize.large} color={palette.accent} aria-hidden />}
  </View>;
}

export function CatalogCart({ client, companyId, entries, updateQuantity, remove, onClose, onCreated }: {
  client: SupabaseClient; companyId: string; entries: CartEntry[];
  updateQuantity: (id: string, value: string) => void; remove: (id: string) => void;
  onClose: () => void; onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<QuoteClient[]>([]);
  const [customer, setCustomer] = useState<QuoteClient>();
  const [checkingOut, setCheckingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState<string>();
  const submitting = useRef(false);

  useEffect(() => {
    if (!checkingOut || customer) return;
    let active = true;
    setLoading(true);
    setError('');
    const search = setTimeout(() => {
      void findClients(client, companyId, query)
        .then((rows) => { if (active) setCustomers(rows); })
        .catch((cause) => { if (active) setError(quoteError(cause)); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(search); };
  }, [checkingOut, client, companyId, customer, query, retry]);

  async function createQuote() {
    if (!customer || !title.trim() || !entries.length || submitting.current) return;
    setError('');
    submitting.current = true;
    setBusy(true);
    try {
      const lines = entries.map(({ item, quantity }) => {
        const scale = item.kind === 'material' ? 3 : 0;
        const count = decimalValue(quantity, scale, scale ? 0.001 : 1, 999999999.999);
        if (count === null) throw new Error(`Revise a quantidade de ${item.name}.`);
        return { id: item.id, quantity: quantity.trim().replace(',', '.').replace(/^0+(?=\d)/, '') };
      });
      const quoteId = pending ?? await createQuoteFromCalculator(client, companyId, title.trim(), lines);
      setPending(quoteId);
      const { quote } = await loadQuote(client, companyId, quoteId, false);
      if (quote.client_id !== customer.id) {
        await saveQuote(client, companyId, { client_id: customer.id }, quote);
      }
      onCreated(quote.id);
    } catch (cause) {
      setError(quoteError(cause));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <BottomSheet visible title={checkingOut ? 'Vincular cliente' : 'Carrinho'} busy={busy} onClose={() => {
    if (pending) onCreated(pending);
    else onClose();
  }}>
    {checkingOut ? <>
      <FormField label="Título do orçamento" placeholder="Ex.: Aniversário de 5 anos" maxLength={120}
        value={title} onChangeText={setTitle} disabled={busy || Boolean(pending)} />
      {customer ? <ListItem title={customer.name} icon="user" trailing={<StatusBadge label="Selecionado" />} /> : <>
        <SearchBar label="Buscar cliente" placeholder="Buscar cliente por nome" value={query} onChangeText={setQuery} />
        {loading ? <LoadingState /> : customers.map((row) => <ListItem key={row.id} title={row.name} icon="user"
          onPress={() => setCustomer(row)} />)}
        {!loading && !error && customers.length === 0 && <Text style={styles.text}>Cadastre o cliente no menu Clientes e volte ao carrinho.</Text>}
        {!loading && error !== '' && <Chip label="Tentar novamente" onPress={() => setRetry((value) => value + 1)} />}
      </>}
      {customer && <Chip label="Escolher outro cliente" onPress={() => setCustomer(undefined)} disabled={busy} />}
      <PrimaryButton label={pending ? 'Vincular ao rascunho' : 'Gerar orçamento'} icon="file-text" loading={busy}
        disabled={!customer || !title.trim()} onPress={() => void createQuote()} />
      {!pending && <Chip label="Voltar aos itens" disabled={busy} onPress={() => { setCheckingOut(false); setError(''); }} />}
      {pending && error !== '' && <Text style={styles.text}>A composição foi salva. Tente vincular o cliente novamente ou abra o rascunho para continuar.</Text>}
    </> : entries.length ? <>
      {entries.map(({ item, quantity }) => <View key={item.id} style={styles.card}>
        <View style={cartStyles.itemHeading}>
          <CartThumbnail key={item.photo_path} client={client} path={item.photo_path} name={item.name} />
          <Text style={[styles.title, cartStyles.itemName]}>{item.name}</Text>
          <IconButton icon="trash-2" label={`Remover ${item.name}`} onPress={() => remove(item.id)} />
        </View>
        <FormField label={item.unit ? `Quantidade (${item.unit})` : 'Quantidade'} value={quantity} maxLength={13}
          keyboardType={item.kind === 'material' ? 'decimal-pad' : 'number-pad'} onChangeText={(value) => updateQuantity(item.id, value)} />
      </View>)}
      <PrimaryButton label="Vincular cliente" icon="arrow-right" onPress={() => setCheckingOut(true)} />
    </> : <Text style={styles.text}>Adicione itens do catálogo para montar o orçamento.</Text>}
    {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </BottomSheet>;
}

const cartStyles = StyleSheet.create({
  itemHeading: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  itemName: { flex: 1, minWidth: 0 },
  thumbnail: {
    width: 56, height: 56, borderRadius: corners.control, overflow: 'hidden',
    backgroundColor: palette.accentSurface, alignItems: 'center', justifyContent: 'center',
  },
});
