import Feather from '@expo/vector-icons/Feather';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { confirmAction } from '../components/confirmAction';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { EmptyState, IconButton, ListItem, LoadingState, PrimaryButton, SearchBar, SecondaryButton, StatusBadge } from '../design-system';
import { iconSize, palette } from '../design-system/tokens';
import { useCompanies } from '../navigation/useCompanies';
import { colors } from '../theme';
import { catalogStyles as styles, Chip } from './controls';
import { CatalogCart, type CartEntry } from './CatalogCart';
import { ItemForm } from './ItemForm';
import { groups, money } from './model';
import type { Category, Company, Item, Kind, Ownership } from './model';
import { archiveItem, catalogError, getPhotoUrl, listCategories, listItems, pageSize } from './repository';

const kinds: Kind[] = ['asset', 'balloon', 'material'];
const kindLabels = { ...groups, material: 'Materiais' };
const kindIcons = { balloon: 'wind', asset: 'layers', material: 'package' } as const;

function itemDescription(item: Item, categoryName?: string) {
  switch (item.kind) {
    case 'balloon':
      return [item.brand, item.size, item.balloon_type].join(' · ');
    case 'asset':
      return [categoryName, item.ownership === 'owned' ? 'Próprio' : 'Alugado'].filter(Boolean).join(' · ');
    case 'material':
      return [categoryName, `${item.quantity?.toLocaleString('pt-BR')} ${item.unit}`].filter(Boolean).join(' · ');
  }
}

function itemCost(item: Item) {
  switch (item.kind) {
    case 'balloon': return `${money(item.unit_cost ?? 0, 6)} por balão`;
    case 'asset': return `${money(item.rental_cost ?? 0)} de locação`;
    case 'material': return money(item.material_cost ?? 0);
  }
}

function ItemDetails({ client, company, item, category, onBack, onEdit, onChanged, onAdd, inCart }: {
  client: SupabaseClient; company: Company; item: Item; category?: Category;
  onBack: () => void; onEdit: () => void; onChanged: (message: string) => void;
  onAdd: () => void; inCart: boolean;
}) {
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(Boolean(item.photo_path));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState<boolean>();

  useEffect(() => {
    if (company.role === 'member') return;
    let active = true;
    void client.from('catalog_items').select('website_visible').eq('company_id', company.id).eq('id', item.id)
      .maybeSingle<{ website_visible: boolean }>().then(({ data, error: cause }) => {
        if (active && !cause && data) setPublished(data.website_visible);
      });
    return () => { active = false; };
  }, [client, company.id, company.role, item.id]);

  useEffect(() => {
    if (!item.photo_path) return;
    let current = true;
    void getPhotoUrl(client, item.photo_path).then((url) => {
      if (current) setPhoto(url);
    }).catch(() => {
      if (current) setPhotoError(true);
    }).finally(() => {
      if (current) setPhotoLoading(false);
    });
    return () => { current = false; };
  }, [client, item.photo_path]);

  async function changeArchive() {
    setBusy(true);
    setError('');
    try {
      await archiveItem(client, company.id, item);
      onChanged(item.archived_at ? 'Item reativado.' : 'Item arquivado.');
    } catch (cause) {
      setError(catalogError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function changePublication() {
    if (published === undefined || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: cause } = await client.rpc('set_catalog_website_visibility', {
        p_company: company.id, p_item: item.id, p_visible: !published,
      });
      if (cause) throw cause;
      setPublished(!published);
    } catch (cause) { setError(catalogError(cause)); }
    finally { setBusy(false); }
  }

  const action = item.archived_at ? 'Reativar' : 'Arquivar';
  return (
    <Screen title={item.name} description={itemDescription(item, category?.name)}>
      <View style={styles.card}>
        {photoLoading && <ActivityIndicator accessibilityLabel="Carregando foto" color={colors.blueGray} />}
        {photo !== '' && <Image source={{ uri: photo }} accessibilityLabel="Foto do balão"
          style={styles.photo} resizeMode="contain" onError={() => { setPhoto(''); setPhotoError(true); }} />}
        {photoError && <Text style={styles.error}>Não foi possível abrir a foto.</Text>}
        {company.role !== 'member' && <Text style={styles.strong}>{itemCost(item)}</Text>}
        {item.kind === 'balloon' && (
          <Text style={styles.text}>{item.package_quantity} por embalagem
            {company.role !== 'member' && item.package_price !== null ? ` · ${money(item.package_price)}` : ''}
          </Text>
        )}
        {item.kind === 'asset' && company.role !== 'member' && (
          <Text style={styles.text}>Acréscimo de {item.markup_percent?.toLocaleString('pt-BR')}%</Text>
        )}
        <Text style={styles.text}>{item.archived_at ? 'Arquivado' : 'Ativo'}</Text>
        {!item.archived_at && published !== undefined && <Text style={styles.text}>{published ? 'Visível no site' : 'Oculto no site'}</Text>}
      </View>
      {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {company.role !== 'member' && (
        <>
          <ActionButton label="Editar item" disabled={busy} onPress={onEdit} />
          {!item.archived_at && published !== undefined && <SecondaryButton label={published ? 'Retirar do site' : 'Publicar no site'}
            disabled={busy} onPress={() => void changePublication()} />}
          <Chip label={busy ? 'Aguarde…' : action} disabled={busy} onPress={() => {
            confirmAction(`${action} item?`, item.name, action, () => void changeArchive());
          }} />
        </>
      )}
      {!item.archived_at && <PrimaryButton label={inCart ? 'Abrir carrinho' : 'Adicionar ao carrinho'} icon="shopping-cart" disabled={busy} onPress={onAdd} />}
      <Chip label="Voltar à lista" disabled={busy} onPress={onBack} />
    </Screen>
  );
}

function CompanyCatalog({ client, company, openQuote }: {
  client: SupabaseClient; company: Company;
  openQuote: (company: string, quote: string) => void;
}) {
  const [kind, setKind] = useState<Kind>('asset');
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [ownership, setOwnership] = useState<Ownership | ''>('');
  const [sort, setSort] = useState<'name' | 'recent'>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [more, setMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Item>();
  const [editing, setEditing] = useState(false);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [showCart, setShowCart] = useState(false);
  const canWrite = company.role !== 'member';

  function addToCart(item: Item) {
    setCart((current) => current.length >= 200 || current.some((entry) => entry.item.id === item.id)
      ? current : [...current, { item, quantity: '1' }]);
  }

  const cartSheet = showCart && <CatalogCart client={client} companyId={company.id} entries={cart}
    updateQuantity={(id, quantity) => setCart((current) => current.map((entry) => entry.item.id === id ? { ...entry, quantity } : entry))}
    remove={(id) => setCart((current) => current.filter((entry) => entry.item.id !== id))}
    onClose={() => setShowCart(false)} onCreated={(id) => { setShowCart(false); setCart([]); openQuote(company.id, id); }} />;

  useEffect(() => {
    let current = true;
    setCategoriesReady(false);
    setCategoryError('');
    void listCategories(client, company.id, kind).then((data) => {
      if (current) {
        setCategories(data);
        setCategoriesReady(true);
      }
    }).catch((cause) => {
      if (current) setCategoryError(catalogError(cause));
    });
    return () => { current = false; };
  }, [client, company.id, kind, revision]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      void listItems(client, { companyId: company.id, kind, search, archived, categoryId, ownership, sort, offset, financial: canWrite })
        .then((data) => {
          if (!current) return;
          setItems(data.slice(0, pageSize));
          setMore(data.length > pageSize);
        }).catch((cause) => {
          if (current) setError(catalogError(cause));
        }).finally(() => {
          if (current) setLoading(false);
        });
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [client, company.id, kind, search, archived, categoryId, ownership, sort, offset, revision, canWrite]);

  function filter(change: () => void) {
    setOffset(0);
    setNotice('');
    change();
  }

  function refresh(message = '') {
    setSelected(undefined);
    setEditing(false);
    setOffset(0);
    setNotice(message);
    setRevision((value) => value + 1);
  }

  function selectKind(group: Kind) {
    if (group === kind) return;
    filter(() => {
      setItems([]);
      setLoading(true);
      setCategories([]);
      setCategoriesReady(false);
      setKind(group);
      setCategoryId('');
      setOwnership('');
    });
  }

  if (editing && canWrite) {
    return <ItemForm client={client} company={company} kind={kind} item={selected} categories={categories}
      onCategory={(category) => setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))}
      onSaved={refresh} onCancel={() => setEditing(false)} />;
  }
  if (selected) {
    const inCart = cart.some(({ item }) => item.id === selected.id);
    return <><ItemDetails client={client} company={company} item={selected} inCart={inCart}
      onAdd={() => { addToCart(selected); setShowCart(true); }}
      category={categories.find((category) => category.id === selected.category_id)}
      onBack={() => setSelected(undefined)} onEdit={() => setEditing(true)} onChanged={refresh} />{cartSheet}</>;
  }

  return (
    <Screen title="Catálogo" description={company.name} layout="wide"
      action={<SecondaryButton label={`Carrinho (${cart.length})`} icon="shopping-cart" onPress={() => setShowCart(true)} />}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de item" style={styles.kindGrid}>
        {kinds.map((group) => {
          const active = group === kind;
          return <Pressable key={group} accessibilityRole="radio" aria-checked={active}
            onPress={() => selectKind(group)} style={({ pressed }) => [styles.kindTile, active && styles.kindActive, pressed && styles.kindPressed]}>
            <Feather name={kindIcons[group]} color={palette.accent} size={iconSize.large} aria-hidden />
            <Text style={[styles.kindLabel, active && styles.kindLabelActive]}>{kindLabels[group]}</Text>
          </Pressable>;
        })}
      </View>
      <View style={styles.toolbar}>
        <View style={styles.search}><SearchBar label="Pesquisar itens" placeholder="Pesquisar itens" value={search}
          onChangeText={(text) => filter(() => setSearch(text))} /></View>
        <Chip label={showFilters ? 'Ocultar filtros' : 'Filtros'}
          active={showFilters || archived || sort !== 'name' || Boolean(categoryId || ownership)}
          onPress={() => setShowFilters((current) => !current)} />
      </View>
      {canWrite && <View style={styles.row}><PrimaryButton label="Novo item" icon="plus" disabled={!categoriesReady}
        onPress={() => setEditing(true)} /></View>}
      {showFilters && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Chip label="Ativos" active={!archived} onPress={() => filter(() => setArchived(false))} />
              <Chip label="Arquivados" active={archived} onPress={() => filter(() => setArchived(true))} />
              <Chip label="Nome A–Z" active={sort === 'name'} onPress={() => filter(() => setSort('name'))} />
              <Chip label="Mais recentes" active={sort === 'recent'} onPress={() => filter(() => setSort('recent'))} />
            </View>
            {kind !== 'balloon' && categories.length > 0 && (
              <View style={styles.row}>
                <Chip label="Todas as categorias" active={!categoryId} onPress={() => filter(() => setCategoryId(''))} />
                {categories.map((category) => <Chip key={category.id} label={category.name} active={categoryId === category.id}
                  onPress={() => filter(() => setCategoryId(category.id))} />)}
              </View>
            )}
            {kind === 'asset' && (
              <View style={styles.row}>
                <Chip label="Qualquer origem" active={!ownership} onPress={() => filter(() => setOwnership(''))} />
                <Chip label="Próprios" active={ownership === 'owned'} onPress={() => filter(() => setOwnership('owned'))} />
                <Chip label="Alugados" active={ownership === 'rented'} onPress={() => filter(() => setOwnership('rented'))} />
              </View>
            )}
          </View>
      )}
      {notice !== '' && <Text accessibilityRole="alert" style={styles.strong}>{notice}</Text>}
      {categoryError !== '' && <EmptyState title="Não foi possível carregar as categorias" description={categoryError} error
        action={{ label: 'Tentar novamente', onPress: () => refresh() }} />}
      {error !== '' && <EmptyState title="Não foi possível carregar os itens" description={error} error
        action={{ label: 'Tentar novamente', onPress: () => refresh() }} />}
      {loading ? <ActivityIndicator accessibilityLabel="Carregando itens" color={colors.blueGray} /> : error === '' && (
        <View style={styles.stack}>
          {items.length === 0 && <EmptyState title="Nenhum item encontrado" icon={kindIcons[kind]}
            description={canWrite && !search.trim() && !archived && !categoryId && !ownership
              ? 'Use Novo item para começar.' : undefined} />}
          {items.length > 0 && <View style={styles.results}>
            {items.map((item) => {
              const inCart = cart.some((entry) => entry.item.id === item.id);
              return <View key={item.id} style={styles.productRow}>
                <View style={styles.productCopy}><ListItem title={item.name} icon={kindIcons[item.kind]}
                  detail={itemDescription(item, categories.find((category) => category.id === item.category_id)?.name)}
                  trailing={canWrite ? <StatusBadge label={itemCost(item)} tone="positive" /> : undefined}
                  onPress={() => setSelected(item)} /></View>
                {!item.archived_at && <IconButton icon={inCart ? 'check' : 'plus'}
                  label={inCart ? `Abrir carrinho com ${item.name}` : `Adicionar ${item.name} ao carrinho`}
                  disabled={!inCart && cart.length >= 200}
                  onPress={() => { if (inCart) setShowCart(true); else addToCart(item); }} />}
              </View>;
            })}
          </View>}
          <View style={styles.row}>
            {offset > 0 && <Chip label="Anterior" onPress={() => setOffset(offset - pageSize)} />}
            {more && <Chip label="Próxima" onPress={() => setOffset(offset + pageSize)} />}
          </View>
        </View>
      )}
      {cartSheet}
    </Screen>
  );
}

export function CatalogScreen({ client, userId, openQuote }: {
  client: SupabaseClient; userId: string; openQuote: (company: string, quote: string) => void;
}) {
  const { company, loading, error, retry } = useCompanies(client, userId);

  if (company && !error) {
    return <CompanyCatalog key={company.id} client={client} company={company} openQuote={openQuote} />;
  }

  return <Screen title="Catálogo" layout="wide">
    {loading ? <LoadingState label="Carregando seu acervo…" /> : error
      ? <EmptyState title="Não foi possível abrir o catálogo" description={error} error
        action={{ label: 'Tentar novamente', onPress: retry }} />
      : <EmptyState title="Seu acesso ainda não está vinculado"
        description="Peça ao responsável da empresa para vincular sua conta." icon="briefcase" />}
  </Screen>;
}
