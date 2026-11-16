import { portalClient as client, portalDestination } from '/portal-session.js';
import { endpoint } from '/config.js';

const view = document.getElementById('portal-view');
const status = document.getElementById('portal-status');
const uidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dates = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });
const types = { casamento: 'Casamento ou noivado', aniversario: 'Aniversário', cha: 'Chá ou comemoração familiar', corporativo: 'Evento corporativo', outro: 'Outro evento' };
const states = { new: 'Nova', reviewing: 'Em análise', closed: 'Encerrada' };
const services = { cenario: 'Painel e cenário', baloes: 'Balões', flores: 'Arranjos florais', mesas: 'Decoração das mesas', completa: 'Decoração completa' };
const decisions = { approved: 'Aceita', negotiate: 'Alterações solicitadas', declined: 'Recusada' };
let session;
let revision = 0;
const segments = location.pathname.split('/').filter(Boolean);
const section = segments[1] ?? 'inicio';
const requestId = segments[2];
const params = new URLSearchParams(location.search);
const page = Math.min(100000, Math.max(0, Number.parseInt(params.get('pagina'), 10) || 0));
const day = (value) => value ? value.split('-').reverse().join('/') : 'A definir';
const requestLink = (id) => '/cliente/orcamentos/' + id;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(label, path, className) {
  const anchor = element('a', label, className);
  anchor.href = path;
  return anchor;
}
function button(label, action, className = 'button outlined') {
  const control = element('button', label, className);
  control.type = 'button';
  control.onclick = action;
  return control;
}
function card(heading) {
  const article = element('article', undefined, 'surface portal-card');
  article.append(element('h2', heading));
  return article;
}
function intro(title, description) {
  const header = element('header', undefined, 'portal-intro');
  header.append(element('p', 'Portal do Cliente', 'eyebrow'), element('h1', title), element('p', description));
  return header;
}
function list(items) {
  const result = element('ul');
  result.append(...items.map((text) => element('li', text)));
  return result;
}
function message(text, state = 'notice') {
  status.dataset.state = state;
  status.textContent = text;
}
function dataError(error) {
  if (['PGRST202', '42703', 'PGRST205'].includes(error?.code)) return 'Esse recurso ainda aguarda a atualização do banco.';
  if (error?.code === '42501') return 'A operação não está disponível para esta conta.';
  if (error?.code === '23505') return 'Já há uma resposta registrada para esta proposta.';
  return 'Não foi possível concluir agora. Tente novamente.';
}
async function rpc(name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}
function pageLinks(base, count) {
  const controls = element('div', undefined, 'portal-actions');
  const target = (next) => {
    const query = new URLSearchParams(params);
    query.set('pagina', String(next));
    return base + '?' + query;
  };
  if (page > 0) controls.append(link('Página anterior', target(page - 1), 'button outlined'));
  if (count > 20) controls.append(link('Próxima página', target(page + 1), 'button outlined'));
  return controls;
}
function eventCard(event) {
  const entry = card(event.title);
  entry.append(element('p', [day(event.event_date), event.location].join(' · ')),
    link('Ver solicitação', requestLink(event.request_id)));
  return entry;
}
async function profile(user) {
  const { data, error } = await client.from('profiles').select('display_name,phone').eq('user_id', user.id).maybeSingle();
  if (error && error.code !== '42703') throw error;
  return data ?? { display_name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : '' };
}
async function dashboard(user) {
  const info = await profile(user);
  const heading = intro(info.display_name ? 'Olá, ' + info.display_name : 'Olá!', 'Acompanhe seus pedidos e suas propostas em um só lugar.');
  const actions = element('div', undefined, 'portal-actions');
  actions.append(link('Meus orçamentos', '/cliente/orcamentos', 'button'),
    link('Solicitar orçamento', '/orcamento.html', 'button outlined'));
  heading.append(actions);
  return [heading];
}
function field(label, control) {
  const wrapper = element('label', label, 'field');
  wrapper.append(control);
  return wrapper;
}
function input(name, type, value, maxlength) {
  const control = element('input');
  control.name = name;
  control.type = type;
  control.value = value ?? '';
  if (maxlength) control.maxLength = maxlength;
  return control;
}
async function requests() {
  const search = (params.get('busca') ?? '').slice(0, 100);
  const wanted = Object.hasOwn(states, params.get('situacao')) ? params.get('situacao') : '';
  const records = await rpc('customer_requests', { p_search: search, p_status: wanted, p_offset: page * 20 });
  const filters = element('form', undefined, 'portal-card surface portal-filter');
  filters.action = '/cliente/orcamentos';
  const select = element('select');
  select.name = 'situacao';
  for (const [value, label] of [['', 'Todas'], ...Object.entries(states)]) {
    const option = element('option', label);
    option.value = value;
    option.selected = value === wanted;
    select.append(option);
  }
  const searchButton = element('button', 'Buscar', 'button');
  filters.append(field('Cidade, empresa ou tipo de evento', input('busca', 'search', search, 100)), field('Situação', select), searchButton);
  const cards = records.slice(0, 20).map((record) => {
    const entry = card(types[record.event_type] ?? 'Evento');
    entry.append(element('p', [record.company, record.city, day(record.event_date), states[record.status]].join(' · ')),
      link('Ver detalhes', requestLink(record.id)));
    return entry;
  });
  return [intro('Meus orçamentos', 'Veja suas solicitações e acompanhe o andamento.'), filters,
    ...(cards.length ? cards : [element('p', 'Nenhuma solicitação encontrada.')]), pageLinks('/cliente/orcamentos', records.length)];
}
const proposalStatus = (proposal) => {
  if (proposal.decision) return decisions[proposal.decision];
  if (proposal.revokedAt ?? proposal.revoked_at) return 'Revogada';
  return Date.parse(proposal.expiresAt ?? proposal.expires_at) <= Date.now() ? 'Expirada' : 'Aguardando resposta';
};
async function proposals() {
  const records = await rpc('customer_proposals', { p_offset: page * 20 });
  return [intro('Minhas propostas', 'Acesse os valores, condições e respostas registradas.'),
    ...(records.length ? records.slice(0, 20).map((proposal) => {
      const entry = card(proposal.title);
      entry.append(element('p', 'Versão ' + proposal.version + ' · ' + proposalStatus(proposal)),
        link('Abrir proposta', requestLink(proposal.request_id) + '#proposta-' + proposal.version));
      return entry;
    }) : [element('p', 'Nenhuma proposta disponível.')]), pageLinks('/cliente/propostas', records.length)];
}
function proposalCard(proposal) {
  const entry = card('Proposta · versão ' + proposal.version);
  entry.id = 'proposta-' + proposal.version;
  const { content } = proposal;
  const total = /^\d{1,30}$/.test(content.total ?? '') ? money.format(BigInt(content.total) / 100n)
    .replace(/,00$/, ',' + content.total.padStart(2, '0').slice(-2)) : 'Valor indisponível';
  entry.append(element('strong', total, 'portal-value'), element('p', proposalStatus(proposal) + ' · Válida até ' + dates.format(new Date(proposal.expiresAt))),
    element('p', content.decoration), element('p', content.payment));
  if (content.materials?.length) entry.append(list(content.materials.map((item) => [item.name, item.quantity, item.unit].filter(Boolean).join(' · '))));
  const feedback = element('p', '', 'feedback');
  feedback.setAttribute('role', 'status');
  const actions = element('div', undefined, 'portal-actions');
  let busy = false;
  async function run(action) {
    if (busy || !session) return;
    busy = true;
    const controls = [...actions.querySelectorAll('button')];
    controls.forEach((item) => { item.disabled = true; });
    feedback.dataset.state = 'loading';
    feedback.textContent = 'Aguarde…';
    try {
      await action();
      feedback.textContent = '';
    } catch (error) {
      feedback.dataset.state = 'error';
      feedback.textContent = error instanceof Error ? error.message : dataError(error);
    } finally {
      controls.forEach((item) => { item.disabled = false; });
      busy = false;
    }
  }
  async function respond(decision) {
    const result = await rpc('respond_customer_proposal', { p_proposal: proposal.id, p_decision: decision,
      p_wants_revision: decision === 'declined' ? false : null });
    if (!result?.decision) throw new Error('A proposta não está mais disponível para resposta.');
    await load();
  }
  if (!proposal.revokedAt && Date.parse(proposal.expiresAt) > Date.now()) {
    actions.append(button('Baixar PDF', () => void run(async () => {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ action: 'customer_pdf', proposalId: proposal.id }) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('O PDF está indisponível no momento.');
      const url = URL.createObjectURL(await response.blob());
      const download = link('PDF', url);
      download.download = 'proposta.pdf';
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    })));
    if (!proposal.decision) {
      for (const [choice, label] of [['approved', 'Aceitar proposta'], ['negotiate', 'Solicitar alterações'], ['declined', 'Recusar proposta']]) {
        actions.append(button(label, () => {
          if (window.confirm(label + '?')) void run(() => respond(choice));
        }, choice === 'approved' ? 'button' : 'button outlined'));
      }
    }
  }
  entry.append(actions, feedback);
  return entry;
}
async function detail() {
  const record = uidPattern.test(requestId) ? await rpc('customer_request', { p_request: requestId }) : null;
  if (!record) return [intro('Solicitação indisponível', 'Confira a lista de solicitações da sua conta.'), link('Voltar aos orçamentos', '/cliente/orcamentos', 'button')];
  const info = card('Evento e decoração');
  const contact = record.contact_details;
  info.append(element('p', [day(record.event_date), record.city, contact?.venue, contact?.guests && contact.guests + ' convidados'].filter(Boolean).join(' · ')),
    element('p', record.services.map((key) => services[key] ?? key).join(' · ')),
    element('p', contact?.inspiration ?? record.details));
  if (contact?.notes) info.append(element('p', contact.notes));
  const materials = card('Materiais solicitados');
  materials.append(record.catalog_items.length ? list(record.catalog_items.map((item) => [item.name, item.quantity, item.unit].filter(Boolean).join(' · ')))
    : element('p', 'Esta solicitação não tem materiais registrados.'));
  const timeline = card('Linha do tempo');
  const entries = record.history.length ? record.history : [{ status: 'new', happened_at: record.created_at }];
  timeline.append(list(entries.map((entry) => states[entry.status] + ' · ' + dates.format(new Date(entry.happened_at)))));
  return [intro(types[record.event_type] ?? 'Evento', record.company + ' · ' + states[record.status]), info, materials, timeline,
    ...(record.proposals.length ? record.proposals.map(proposalCard) : [element('p', 'Ainda não há propostas para este pedido.')])];
}
async function events() {
  const rows = await rpc('customer_events');
  return [intro('Meus eventos', 'Veja as celebrações confirmadas pela empresa.'),
    ...(rows.length ? rows.map(eventCard) : [element('p', 'Você ainda não tem eventos confirmados.')])];
}
function formAction(form, label, save) {
  const feedback = element('p', '', 'feedback');
  feedback.setAttribute('role', 'status');
  const submit = element('button', label, 'button');
  form.append(submit, feedback);
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    feedback.dataset.state = 'loading';
    feedback.textContent = 'Salvando…';
    try {
      feedback.textContent = await save(new FormData(form));
      feedback.dataset.state = 'success';
    } catch (error) {
      feedback.textContent = error instanceof Error ? error.message : dataError(error);
      feedback.dataset.state = 'error';
    } finally { submit.disabled = false; }
  };
}
async function account(user) {
  const info = await profile(user);
  const dataCard = card('Dados cadastrais');
  const form = element('form');
  const name = input('nome', 'text', info.display_name, 120);
  name.required = true;
  name.autocomplete = 'name';
  const email = input('email', 'email', user.email);
  email.readOnly = true;
  const phone = input('telefone', 'tel', info.phone, 24);
  phone.autocomplete = 'tel';
  form.append(field('Nome', name), field('E-mail da conta', email), field('Telefone (opcional)', phone));
  formAction(form, 'Salvar perfil', async (values) => {
    const displayName = String(values.get('nome')).trim();
    const raw = String(values.get('telefone')).trim();
    const cleaned = raw.replace(/[\s().-]/g, '');
    if (!displayName) throw new Error('Informe seu nome.');
    if (raw && !/^\+?\d{10,15}$/.test(cleaned)) throw new Error('Informe um telefone com DDD, entre 10 e 15 dígitos.');
    const { error } = await client.from('profiles').upsert({ user_id: user.id, display_name: displayName, phone: cleaned || null });
    if (error) throw error;
    return 'Perfil atualizado.';
  });
  dataCard.append(form);
  const passwordCard = card('Alterar senha');
  const passwordForm = element('form');
  const password = input('senha', 'password', '', 128);
  const confirm = input('repetir', 'password', '', 128);
  for (const control of [password, confirm]) {
    control.required = true;
    control.minLength = 8;
    control.autocomplete = 'new-password';
  }
  passwordForm.append(field('Nova senha', password), field('Confirme a nova senha', confirm));
  formAction(passwordForm, 'Salvar nova senha', async (values) => {
    if (values.get('senha') !== values.get('repetir')) throw new Error('As senhas são diferentes.');
    const { error } = await client.auth.updateUser({ password: values.get('senha') });
    if (error) throw error;
    passwordForm.reset();
    return 'Senha alterada.';
  });
  passwordCard.append(passwordForm);
  return [intro('Meu perfil', 'Mantenha seus dados de contato atualizados.'), dataCard, passwordCard];
}

async function load() {
  if (!session) return;
  const request = ++revision;
  const user = session.user;
  message('Carregando…', 'loading');
  view.replaceChildren();
  try {
    const content = await ({
      inicio: () => dashboard(user), orcamentos: requestId ? detail : requests,
      propostas: proposals, eventos: events, perfil: () => account(user),
    }[section] ?? (() => [intro('Página indisponível', 'Use o menu para escolher uma área.')]))();
    if (request !== revision) return;
    view.append(...content);
    message('');
    if (requestId && /^#proposta-\d+$/.test(location.hash)) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    if (request !== revision) return;
    message(dataError(error), 'error');
    view.append(button('Tentar novamente', () => void load()));
  }
}
if (!client) {
  message('O portal está indisponível no momento.', 'error');
} else {
  const navigation = document.getElementById('portal-nav');
  const current = section === 'inicio' ? '/cliente' : '/cliente/' + section;
  for (const anchor of navigation.querySelectorAll('a')) {
    if (anchor.getAttribute('href') === current) anchor.setAttribute('aria-current', 'page');
  }
  document.getElementById('portal-logout').onclick = async () => {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) message(dataError(error), 'error');
  };
  client.auth.onAuthStateChange((event, active) => {
    const previous = session?.user.id;
    session = active;
    if (!active) {
      revision++;
      view.replaceChildren();
      location.replace('/login?destino=cliente');
    } else if (previous !== active.user.id || event === 'INITIAL_SESSION') {
      navigation.hidden = document.getElementById('portal-account').hidden = false;
      setTimeout(() => {
        if (session?.user.id !== active.user.id) return;
        void portalDestination(client, active.user.id).then((area) => {
          if (session?.user.id === active.user.id) document.getElementById('staff-link').hidden = area !== '/admin';
        }).catch(() => {});
        void load();
      }, 0);
    }
  });
}
