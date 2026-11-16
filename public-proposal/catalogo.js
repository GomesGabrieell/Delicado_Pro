import { config, portalClient, quantityValue, readDraft, saveDraft } from './portal-session.js';

const element = (id) => document.getElementById(id);
const search = element('catalog-search');
const listing = element('catalog-items');
const basket = element('basket-items');
const previous = element('previous');
const next = element('next');
const continueButton = element('save-selection');
const reviewShortcut = element('review-selection');
const showSelection = element('show-selection');
const basketTitle = element('basket-title');
const labels = { balloon: 'Balões', asset: 'Acervo', material: 'Materiais complementares' };
const pageSize = 24;
let user;
let draft;
let selected = new Map();
let page = 0;
let revision = 0;

function node(tag, content, className) {
  const result = document.createElement(tag);
  if (content) result.textContent = content;
  if (className) result.className = className;
  return result;
}

function button(text, onClick, className = 'button outlined') {
  const result = node('button', text, className);
  result.type = 'button';
  result.onclick = onClick;
  return result;
}

function saveSelection() {
  draft.items = [...selected.values()];
  try {
    saveDraft(user.id, draft);
    return true;
  } catch {
    element('basket-status').textContent = 'O navegador não conseguiu salvar a seleção nesta aba.';
    return false;
  }
}

function updateProductButtons() {
  for (const control of listing.querySelectorAll('[data-catalog-item]')) {
    const added = selected.has(control.dataset.catalogItem);
    control.textContent = added ? 'Na seleção' : 'Adicionar';
    control.dataset.selected = String(added);
    control.setAttribute('aria-label', (added ? 'Ajustar quantidade de ' : 'Adicionar ') + control.dataset.catalogName);
  }
}

function renderBasket() {
  basket.replaceChildren();
  element('basket-empty').hidden = Boolean(selected.size);
  continueButton.disabled = reviewShortcut.disabled = !selected.size;
  basketTitle.textContent = selected.size ? `Sua seleção (${selected.size})` : 'Sua seleção';
  showSelection.textContent = `Sua seleção (${selected.size})`;
  for (const [id, item] of selected) {
    const row = node('li', null, 'basket-row');
    const label = node('label', item.unit ? `Quantidade (${item.unit})` : 'Quantidade', 'field');
    const input = node('input');
    input.type = 'text';
    input.inputMode = item.kind === 'material' ? 'decimal' : 'numeric';
    input.maxLength = 13;
    input.value = item.quantity;
    input.setAttribute('aria-label', 'Quantidade de ' + item.name);
    input.setAttribute('aria-describedby', 'basket-status');
    input.oninput = () => {
      item.quantity = input.value;
      input.removeAttribute('aria-invalid');
      element('basket-status').textContent = '';
      saveSelection();
    };
    label.append(input);
    const remove = button('Remover', () => {
      selected.delete(id);
      saveSelection();
      renderBasket();
      element('selection-announcement').textContent = `${item.name} removido. ${selected.size} na seleção.`;
      const product = listing.querySelector(`[data-catalog-item="${CSS.escape(id)}"]`);
      (product ?? basketTitle).focus();
    }, 'text-button');
    remove.setAttribute('aria-label', 'Remover ' + item.name);
    row.append(node('strong', item.name), label, remove);
    basket.append(row);
  }
  updateProductButtons();
}

function showPhoto(photo, item, uploadedPhoto) {
  // These IDs belong to the illustrative items added to Empresa teste.
  const reference = /^6736827b-1e36-4356-a701-0{10}(0[1-9]|1[0-5])$/.exec(item.id);
  const url = uploadedPhoto ?? (reference ? `assets/catalogo/${reference[1]}.webp` : null);
  if (url) {
    const image = node('img');
    image.alt = uploadedPhoto ? item.name : 'Imagem ilustrativa de ' + item.name;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = url;
    photo.classList.toggle('catalog-photo-reference', !uploadedPhoto);
    image.onerror = () => {
      if (photo.firstChild !== image) return;
      photo.classList.remove('catalog-photo-reference');
      photo.textContent = 'Sem foto';
    };
    photo.replaceChildren(image);
    if (!uploadedPhoto) {
      const label = node('span', 'Imagem ilustrativa', 'image-label');
      label.setAttribute('aria-hidden', 'true');
      photo.append(label);
    }
  }
}

function renderItem(item) {
  const card = node('article', null, 'catalog-item');
  const photo = node('div', 'Sem foto', 'catalog-photo');
  showPhoto(photo, item);
  const content = node('div', null, 'catalog-item-copy');
  const description = [item.category ?? labels[item.kind], item.brand, item.size, item.balloon_type].filter(Boolean).join(' · ');
  const add = button('Adicionar', () => {
    if (selected.has(item.id)) {
      const inputs = [...basket.querySelectorAll('input')];
      inputs[[...selected.keys()].indexOf(item.id)]?.focus();
      return;
    }
    if (selected.size >= 50) {
      element('basket-status').textContent = 'Selecione até 50 materiais por pedido.';
      return;
    }
    selected.set(item.id, { id: item.id, name: item.name, kind: item.kind, unit: item.unit, quantity: '1' });
    element('basket-status').textContent = '';
    saveSelection();
    renderBasket();
    element('selection-announcement').textContent = `${item.name} adicionado. ${selected.size} na seleção.`;
  });
  add.dataset.catalogItem = item.id;
  add.dataset.catalogName = item.name;
  content.append(node('h2', item.name), node('p', description), add);
  card.append(photo, content);
  return card;
}

async function loadPhotos(items, cards, attempt) {
  const paths = [...new Set(items.flatMap((item) => item.photo_path ? [item.photo_path] : []))];
  if (!paths.length) return;
  try {
    const { data, error } = await portalClient.storage.from('catalog-images').createSignedUrls(paths, 600);
    if (error || attempt !== revision) return;
    const photos = new Map(data.flatMap((image) => image.signedUrl ? [[image.path, image.signedUrl]] : []));
    items.forEach((item, index) => {
      const url = photos.get(item.photo_path);
      if (url) showPhoto(cards[index].firstElementChild, item, url);
    });
  } catch {
    // A falha nas fotos não impede que os materiais sejam selecionados.
  }
}

async function load() {
  const attempt = ++revision;
  const fields = new FormData(search);
  const status = element('catalog-status');
  status.dataset.state = 'loading';
  status.textContent = 'Carregando catálogo…';
  listing.replaceChildren();
  previous.hidden = next.hidden = true;
  try {
    const { data, error } = await portalClient.rpc('list_website_catalog', {
      p_portal: config.portal, p_kind: fields.get('kind'), p_query: fields.get('query').trim(), p_offset: page * pageSize,
    });
    if (error) throw error;
    if (attempt !== revision) return;
    const items = data.slice(0, pageSize);
    const cards = items.map(renderItem);
    listing.replaceChildren(...cards);
    updateProductButtons();
    delete status.dataset.state;
    status.textContent = items.length ? '' : 'Nenhum material encontrado. Tente outra busca ou categoria.';
    previous.hidden = page === 0;
    next.hidden = data.length <= pageSize;
    void loadPhotos(items, cards, attempt);
  } catch (error) {
    if (attempt !== revision) return;
    status.dataset.state = 'error';
    if (['PGRST202', 'P0002'].includes(error.code)) {
      status.textContent = 'O catálogo ainda não está disponível para consulta.';
    } else if (error.code === '42501' && !user?.email_confirmed_at) {
      status.textContent = 'Confirme seu e-mail e entre novamente para consultar o catálogo.';
    } else {
      status.textContent = 'Não foi possível carregar o catálogo. Selecione Buscar para tentar novamente.';
    }
    previous.hidden = page === 0;
  }
}

search.onsubmit = (event) => { event.preventDefault(); page = 0; void load(); };
search.elements.namedItem('kind').onchange = () => { page = 0; void load(); };
previous.onclick = () => { page--; void load(); };
next.onclick = () => { page++; void load(); };
function reviewSelection() {
  const invalid = [...selected.values()].findIndex((item) => quantityValue(item.quantity, item.kind) === null);
  if (invalid !== -1) {
    const input = basket.querySelectorAll('input')[invalid];
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    element('basket-status').textContent = 'Informe uma quantidade válida para cada item.';
    return;
  }
  if (saveSelection()) location.assign('orcamento.html');
}

continueButton.onclick = reviewShortcut.onclick = reviewSelection;
showSelection.onclick = () => basketTitle.focus();

if (portalClient) {
  portalClient.auth.onAuthStateChange((event, session) => {
    if (!session?.user) {
      revision++;
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') location.replace('orcamento.html?destino=catalogo');
      return;
    }
    if (user?.id === session.user.id) return;
    user = session.user;
    draft = readDraft(user.id);
    if (draft.pending) {
      location.replace('orcamento.html');
      return;
    }
    selected = new Map((draft.items ?? []).map((item) => [item.id, item]));
    element('catalog-access').hidden = true;
    element('catalog').hidden = false;
    renderBasket();
    void load();
  });
} else {
  element('catalog-access').dataset.state = 'error';
  element('catalog-access').textContent = 'O acesso ao catálogo está indisponível.';
}
