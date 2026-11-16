import { clearDraft, config, portalClient as auth, portalDestination, quantityValue, readDraft, saveDraft } from './portal-session.js';

const find = (id) => document.getElementById(id);
const authForm = find('auth-form');
const requestForm = find('request-form');
const authButton = find('auth-button');
const authSwitch = find('auth-switch');
const authRecover = find('auth-recover');
const emailField = authForm.elements.namedItem('email');
const passwordField = authForm.elements.namedItem('password');
const confirmationField = authForm.elements.namedItem('confirmation');
const nameField = authForm.elements.namedItem('name');
const signout = find('signout');
const requestButton = find('request-button');
const params = new URLSearchParams(location.search);
const authReturnKey = 'delicado-auth-return:' + config?.portal;
const callback = params.has('code') || params.has('error_code');
let authReturn;
if (callback) {
  try {
    authReturn = JSON.parse(localStorage.getItem(authReturnKey));
  } catch {
    // The callback can still proceed without its original destination.
  }
}
const eventField = requestForm.elements.namedItem('event');
const requestedEvent = params.get('evento') ?? authReturn?.event;
const selectedEvent = [...eventField.options].some(({ value }) => value === requestedEvent) ? requestedEvent : '';
const catalogDestination = (params.get('destino') ?? authReturn?.destination) === 'catalogo';
const clientDestination = (params.get('destino') ?? authReturn?.destination) === 'cliente';
const portalEntry = ['/login', '/cadastro'].includes(location.pathname) || ['portal', 'cliente'].includes(authReturn?.destination);
let authMode = location.pathname === '/cadastro' ? 'signup' : 'login';
let routingUser = null;
let invitation;
let requestClaim;
if (portalEntry) {
  try {
    const fragment = new URLSearchParams(location.hash.slice(1));
    for (const [name, key] of [['convite', 'delicado-pending-invitation'], ['pedido', 'delicado-pending-request']]) {
      const token = fragment.get(name);
      if (token && /^[a-f0-9]{64}$/.test(token)) {
        sessionStorage.setItem(key, token);
        history.replaceState(null, '', location.pathname + location.search);
      }
    }
    invitation = sessionStorage.getItem('delicado-pending-invitation');
    requestClaim = sessionStorage.getItem('delicado-pending-request');
  } catch {
    // The invitation can be reopened after authentication.
  }
}
let recoveryLink = params.get('recuperar') === '1' || authReturn?.mode === 'recover';
let sessionUser = null;
let draft = {};
let submitting = false;

function feedback(id, message, state) {
  const status = find(id);
  status.setAttribute('data-state', state);
  if (status.textContent !== message) status.textContent = message;
}
function authMessage(message, state = 'notice') { feedback('auth-message', message, state); }
function requestMessage(message, state = 'notice') { feedback('request-message', message, state); }

const fieldNames = ['event', 'date', 'city', 'venue', 'guests', 'details', 'name', 'whatsapp', 'notes'];
const stepSections = ['event-fields', 'decoration-fields', 'contact-fields', 'review-fields'];
const stepTitles = ['Conte sobre o evento', 'Monte sua decoração', 'Como podemos falar com você?', 'Revise sua solicitação'];
let step = 1;

function field(name) { return requestForm.elements.namedItem(name); }

function selectedItems(target) {
  find(target).replaceChildren(...(draft.items ?? []).map((item) => {
    const row = document.createElement('li');
    row.textContent = [item.name, [item.quantity, item.unit].filter(Boolean).join(' ')].join(' · ');
    return row;
  }));
}

function renderSummary() {
  const form = eventDetails();
  const services = [...requestForm.querySelectorAll('[name="service"]')].filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.closest('label').textContent.trim()).join(', ');
  const pairs = [
    ['Evento', [...eventField.options].find((option) => option.value === form.event)?.textContent],
    ['Data prevista', form.date?.split('-').reverse().join('/') || 'A definir'],
    ['Cidade', form.city], ['Local', form.venue], ['Convidados', form.guests],
    ['Serviços', services], ['Inspirações', form.details], ['Nome', form.name],
    ['WhatsApp', form.whatsapp], ['E-mail', sessionUser?.email], ['Observações', form.notes],
  ];
  find('request-summary').replaceChildren(...pairs.filter(([, value]) => value).flatMap(([label, value]) => {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    return [term, description];
  }));
  selectedItems('review-materials');
}

function updateRequestControls() {
  const locked = Boolean(draft.pending || submitting);
  stepSections.forEach((id, index) => { find(id).hidden = index !== step - 1; });
  for (let index = 1; index <= 5; index++) {
    find('progress-' + index).setAttribute('aria-current', index === step ? 'step' : 'false');
  }
  for (const id of ['edit-event', 'edit-decoration', 'edit-contact', 'edit-selection']) find(id).disabled = locked;
  find('request-back').hidden = locked || step === 1;
  signout.disabled = submitting;
  requestButton.disabled = submitting;
  requestForm.setAttribute('aria-busy', String(submitting));
  requestButton.textContent = draft.pending ? 'Confirmar envio novamente' : step === 4 ? 'Enviar solicitação' : 'Continuar';
  find('request-step').textContent = 'Etapa ' + step + ' de 5';
  find('request-title').textContent = stepTitles[step - 1];
}

function restoreRequest(user) {
  requestForm.reset();
  draft = user ? readDraft(user.id) : {};
  const customerName = user?.user_metadata?.display_name;
  const remembered = draft.form ?? {};
  for (const name of fieldNames) {
    const fallback = name === 'event' ? selectedEvent
      : name === 'name' && typeof customerName === 'string' ? customerName.trim().slice(0, 120) : '';
    field(name).value = remembered[name] ?? fallback;
  }
  field('verified-email').value = user?.email ?? '';
  for (const checkbox of requestForm.querySelectorAll('[name="service"]')) {
    checkbox.checked = remembered.services?.includes(checkbox.value) ?? false;
  }
  const hasItems = Boolean(draft.items?.length);
  find('selection-empty').hidden = hasItems;
  find('edit-selection').textContent = hasItems ? 'Voltar ao catálogo' : 'Escolher materiais';
  selectedItems('selected-materials');
  const hasEvent = Boolean(remembered.event && remembered.city);
  const legacyReview = hasItems && remembered.name && remembered.services?.length;
  step = draft.pending ? 4 : !hasEvent ? 1 : Number.isInteger(draft.step) && draft.step >= 1 && draft.step <= 4
    ? draft.step : legacyReview ? 4 : 2;
  updateRequestControls();
}

function renderSession(user) {
  if (user && portalEntry && !recoveryLink) {
    if (routingUser !== user.id) {
      routingUser = user.id;
      setTimeout(() => { void openAuthorizedArea(user); }, 0);
    }
    return;
  }
  if (!user && routingUser) {
    routingUser = null;
    authForm.hidden = false;
    find('auth-alternate').hidden = false;
    find('access-retry').hidden = true;
    showAuthMode();
  }
  if (user && !recoveryLink && catalogDestination) {
    location.replace('catalogo.html');
    return;
  }
  const changedAccount = sessionUser?.id !== user?.id;
  if (changedAccount) {
    restoreRequest(user);
    requestMessage(draft.pending ? 'O envio anterior ainda precisa ser confirmado.' : '');
    find('done').hidden = true;
  }
  sessionUser = user;
  if (changedAccount && user && step === 4) renderSummary();
  find('access').hidden = Boolean(user) && !recoveryLink;
  find('request').hidden = !user || recoveryLink || !find('done').hidden;
  find('signed-in').textContent = user?.email ?? '';
  if (user && changedAccount && !recoveryLink) find('request-title').focus();
}

async function openAuthorizedArea(user) {
  if (routingUser !== user.id) return;
  authForm.hidden = true;
  find('auth-alternate').hidden = true;
  authRecover.hidden = true;
  find('access-retry').hidden = true;
  authMessage('Verificando sua área de acesso…', 'loading');
  try {
    if (requestClaim) {
      const { data, error } = await auth.rpc('accept_customer_request_claim', { p_token: requestClaim });
      if (routingUser !== user.id) return;
      requestClaim = null;
      try { sessionStorage.removeItem('delicado-pending-request'); } catch { /* Navigation remains available. */ }
      if (error || !/^[a-f0-9-]{36}$/i.test(data ?? '')) {
        throw new Error('Não foi possível vincular o pedido. Confira o e-mail confirmado e a validade do link.');
      }
      location.replace('/cliente/orcamentos/' + data);
      return;
    }
    const acceptingInvitation = Boolean(invitation);
    if (invitation) {
      const { error } = await auth.rpc('accept_company_invitation', { p_token: invitation });
      if (routingUser !== user.id) return;
      invitation = null;
      try { sessionStorage.removeItem('delicado-pending-invitation'); } catch { /* Navigation remains available. */ }
      if (error) throw new Error('Não foi possível aceitar o convite. Confira o e-mail confirmado e a validade do link.');
    }
    const area = clientDestination && !acceptingInvitation ? '/cliente' : await portalDestination(auth, user.id);
    if (routingUser === user.id) location.replace(area);
  } catch (error) {
    if (routingUser !== user.id) return;
    authMessage(error instanceof Error ? error.message : 'Não foi possível verificar seus vínculos.', 'error');
    find('access-retry').onclick = () => void openAuthorizedArea(user);
    find('access-retry').hidden = false;
  }
}

function showAuthMode() {
  const registering = authMode === 'signup';
  const recovering = authMode === 'recover';
  const resetting = authMode === 'reset';
  const newPassword = registering || resetting;
  if (portalEntry) find('access-eyebrow').textContent = 'Portal Delicado Pro';
  find('access-title').textContent = {
    login: portalEntry ? 'Acesse sua conta' : 'Entre para continuar',
    signup: 'Crie sua conta de cliente', recover: 'Recupere seu acesso', reset: 'Crie uma nova senha',
  }[authMode];
  find('access-description').textContent = {
    login: portalEntry ? 'O mesmo acesso para clientes e equipes autorizadas.'
      : 'Entre com sua conta para escolher a decoração e enviar seu pedido.',
    signup: portalEntry ? 'Confirme o e-mail para acessar o Portal do Cliente.'
      : 'Preencha seus dados e confirme o e-mail para solicitar seu orçamento.',
    recover: 'Informe seu e-mail para receber o link de recuperação.',
    reset: 'Escolha a senha que você usará para entrar.',
  }[authMode];
  authButton.textContent = { login: 'Entrar', signup: 'Criar conta', recover: 'Enviar link', reset: 'Salvar nova senha' }[authMode];
  authSwitch.textContent = authMode === 'login' ? 'Criar minha conta' : 'Voltar para o login';
  find('auth-alternate-label').textContent = authMode === 'login' ? 'É a sua primeira vez aqui?' : '';
  authRecover.hidden = authMode !== 'login';
  find('signup-name').hidden = !registering;
  find('signup-confirmation').hidden = !newPassword;
  find('password-hint').hidden = !newPassword;
  find('auth-email-field').hidden = emailField.disabled = resetting;
  find('auth-password-field').hidden = passwordField.disabled = recovering;
  nameField.disabled = !registering;
  nameField.required = registering;
  confirmationField.disabled = !newPassword;
  confirmationField.required = newPassword;
  passwordField.autocomplete = newPassword ? 'new-password' : 'current-password';
  passwordField.minLength = newPassword ? 8 : 0;
  if (newPassword) passwordField.setAttribute('aria-describedby', 'password-hint');
  else passwordField.removeAttribute('aria-describedby');
  passwordField.value = '';
  confirmationField.value = '';
  authMessage('');
}

function returnUrl() {
  if (portalEntry) return clientDestination ? '/login?destino=cliente' : '/login';
  const url = new URL('orcamento.html', location.href);
  if (selectedEvent) url.searchParams.set('evento', selectedEvent);
  if (catalogDestination) url.searchParams.set('destino', 'catalogo');
  return url.href;
}

function authCallbackUrl(mode) {
  try {
    localStorage.setItem(authReturnKey, JSON.stringify({ mode, event: selectedEvent,
      destination: portalEntry ? (clientDestination ? 'cliente' : 'portal') : catalogDestination ? 'catalogo' : '' }));
  } catch {
    // Supabase handles the callback even when the original destination cannot be saved.
  }
  return new URL('orcamento.html', location.href).href;
}

authSwitch.addEventListener('click', () => {
  if (recoveryLink) {
    location.replace(returnUrl());
    return;
  }
  authMode = authMode === 'login' ? 'signup' : 'login';
  showAuthMode();
  (authMode === 'signup' ? nameField : emailField).focus();
});

authRecover.addEventListener('click', () => {
  authMode = 'recover';
  showAuthMode();
  emailField.focus();
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!auth || authButton.disabled) return;
  const mode = authMode;
  const credentials = { email: emailField.value.trim(), password: passwordField.value };
  const name = nameField.value.trim();
  if (mode === 'signup' && !name) {
    authMessage('Informe seu nome para criar a conta.', 'error');
    nameField.focus();
    return;
  }
  if (['signup', 'reset'].includes(mode) && credentials.password !== confirmationField.value) {
    authMessage('As senhas estão diferentes. Confira a confirmação e tente novamente.', 'error');
    confirmationField.focus();
    return;
  }
  authButton.disabled = true;
  authSwitch.disabled = true;
  authRecover.disabled = true;
  authMessage('Aguarde um instante…', 'loading');
  try {
    const result = mode === 'recover'
      ? await auth.auth.resetPasswordForEmail(credentials.email, { redirectTo: authCallbackUrl(mode) })
      : mode === 'reset' ? await auth.auth.updateUser({ password: credentials.password })
      : mode === 'signup'
      ? await auth.auth.signUp({
          ...credentials,
          options: {
            data: { display_name: name },
            emailRedirectTo: authCallbackUrl(mode),
          },
        })
      : await auth.auth.signInWithPassword(credentials);
    if (result.error) throw result.error;
    if (mode === 'reset') {
      location.replace(returnUrl());
      return;
    }
    if (mode === 'recover' || (mode === 'signup' && !result.data.session)) {
      authMode = 'login';
      showAuthMode();
      authMessage(mode === 'recover'
        ? 'Se houver uma conta com esse e-mail, você receberá o link de recuperação. Confira também a pasta de spam.'
        : 'Confira sua caixa de entrada e o spam. Depois de confirmar o e-mail, volte para entrar.', 'success');
    }
    passwordField.value = '';
    confirmationField.value = '';
  } catch (error) {
    authMessage(error.code === 'email_not_confirmed'
      ? 'Confirme seu e-mail antes de entrar.'
      : {
        signup: 'Não foi possível criar a conta. Confira os dados ou tente entrar se você já tiver cadastro.',
        login: 'Não foi possível entrar. Confira seu e-mail e sua senha e tente novamente.',
        recover: 'Não foi possível solicitar o link agora. Tente novamente em alguns instantes.',
        reset: 'Não foi possível salvar a senha. Verifique os requisitos ou solicite outro link.',
      }[mode], 'error');
  } finally {
    authButton.disabled = false;
    authSwitch.disabled = false;
    authRecover.disabled = false;
  }
});

signout.addEventListener('click', async () => {
  signout.disabled = true;
  const userId = sessionUser?.id;
  const preservePending = Boolean(draft.pending || draft.key);
  try {
    const { error } = await auth.auth.signOut({ scope: 'local' });
    if (error) throw error;
    if (!preservePending) clearDraft(userId);
    authMessage('Você saiu da sua conta.');
  } catch {
    requestMessage('Não foi possível sair. Tente novamente.', 'error');
  } finally {
    signout.disabled = false;
  }
});

function eventDetails() {
  const fields = new FormData(requestForm);
  return {
    ...Object.fromEntries(fieldNames.map((name) => [name, String(fields.get(name) ?? '').trim()])),
    services: fields.getAll('service'),
  };
}

function snapshot(form, nextStep = step) {
  return { ...draft, form, step: nextStep };
}

function goToStep(nextStep, focus = true) {
  if (draft.pending || submitting) return;
  draft = snapshot(eventDetails(), nextStep);
  step = nextStep;
  updateRequestControls();
  requestMessage('');
  if (nextStep === 4) renderSummary();
  try {
    saveDraft(sessionUser.id, draft);
  } catch {
    requestMessage('O navegador não conseguiu salvar o rascunho nesta aba.', 'error');
  }
  if (focus) find('request-title').focus();
}

function openCatalog() {
  if (!sessionUser || submitting || draft.pending) return;
  const form = eventDetails();
  if (!validateStep(1, form)) return;
  try {
    saveDraft(sessionUser.id, snapshot(form, 2));
    location.assign('catalogo.html');
  } catch {
    requestMessage('O navegador não conseguiu guardar os dados do orçamento nesta aba.', 'error');
  }
}

find('edit-selection').onclick = openCatalog;
find('request-back').onclick = () => goToStep(step - 1);
['edit-event', 'edit-decoration', 'edit-contact'].forEach((id, index) => {
  find(id).onclick = () => goToStep(index + 1);
});
document.querySelector('.site-nav a[href="catalogo.html"]').addEventListener('click', (event) => {
  if (!sessionUser || find('request').hidden || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openCatalog();
});
requestForm.addEventListener('input', (event) => {
  if (!sessionUser || submitting || draft.pending) return;
  event.target.removeAttribute('aria-invalid');
  event.target.removeAttribute('aria-describedby');
  requestMessage('');
  draft = snapshot(eventDetails());
  try {
    saveDraft(sessionUser.id, draft);
  } catch {
    requestMessage('O navegador não conseguiu salvar o rascunho nesta aba.', 'error');
  }
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && sessionUser) {
    restoreRequest(sessionUser);
    if (step === 4) renderSummary();
  }
});

function fail(targetStep, message, control) {
  if (step !== targetStep) goToStep(targetStep, false);
  requestMessage(message, 'error');
  control.setAttribute('aria-describedby', 'request-message');
  control.setAttribute('aria-invalid', 'true');
  control.focus();
  return false;
}

function validateStep(target, form) {
  if (target === 1) {
    if (!form.event) return fail(1, 'Selecione o tipo de evento.', field('event'));
    if (!form.city) return fail(1, 'Informe a cidade do evento.', field('city'));
    if (field('date').validity?.badInput) return fail(1, 'Confira a data do evento.', field('date'));
    if (field('guests').validity?.badInput || (form.guests && !/^(?:[1-9][0-9]{0,4}|100000)$/.test(form.guests))) {
      return fail(1, 'Informe um número inteiro de convidados entre 1 e 100.000.', field('guests'));
    }
  }
  if (target === 2) {
    if (!form.services.length) return fail(2, 'Selecione pelo menos um serviço de decoração.', requestForm.querySelector('[name="service"]'));
    if (!draft.items?.length || draft.items.some((item) => quantityValue(item.quantity, item.kind) === null)) {
      return fail(2, 'Escolha os materiais e confira as quantidades no catálogo.', find('edit-selection'));
    }
  }
  if (target === 3) {
    if (!form.name) return fail(3, 'Informe seu nome.', field('name'));
    if (form.whatsapp && (!/^[+()0-9 .-]+$/.test(form.whatsapp) || !/^\d{10,15}$/.test(form.whatsapp.replace(/\D/g, '')))) {
      return fail(3, 'Informe um WhatsApp com DDD, entre 10 e 15 dígitos.', field('whatsapp'));
    }
  }
  return true;
}

function submission(form) {
  const contact = {
    venue: form.venue, guests: form.guests ? Number(form.guests) : null,
    whatsapp: form.whatsapp.replace(/\D/g, ''), inspiration: form.details, notes: form.notes,
  };
  const paragraphs = [
    ['Local', contact.venue], ['Convidados', contact.guests], ['WhatsApp', contact.whatsapp],
    ['Inspirações', contact.inspiration], ['Observações', contact.notes],
  ];
  const details = paragraphs.some(([label, value]) => label !== 'Inspirações' && value)
    ? paragraphs.filter(([, value]) => value).map(([label, value]) => label + ': ' + value).join('\n')
    : contact.inspiration;
  if ([...details].length > 2000) {
    fail(2, 'Reduza as inspirações ou observações. Juntas, as informações adicionais devem caber em 2.000 caracteres.', field('details'));
    return null;
  }
  return {
    p_portal: config.portal, p_request_key: draft.key ?? crypto.randomUUID(), p_name: form.name,
    p_event: form.event, p_services: form.services, p_date: form.date || null, p_city: form.city,
    p_details: details, p_items: draft.items.map((item) => ({ id: item.id, quantity: quantityValue(item.quantity, item.kind) })),
    p_contact: contact,
  };
}

async function sendRequest(pending) {
  const { p_contact, ...legacy } = pending;
  if (p_contact) {
    const result = await auth.rpc('submit_website_catalog_request_v2', pending);
    if (result.error?.code !== 'PGRST202') return result;
  }
  return auth.rpc('submit_website_catalog_request', legacy);
}

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!sessionUser || submitting || !find('done').hidden) return;
  const submittedBy = sessionUser.id;
  if (!draft.pending) {
    const form = eventDetails();
    if (step < 4) {
      if (validateStep(step, form)) goToStep(step + 1);
      return;
    }
    if (![1, 2, 3].every((target) => validateStep(target, form))) return;
    const pending = submission(form);
    if (!pending) return;
    const nextDraft = { ...snapshot(form), pending };
    try {
      saveDraft(submittedBy, nextDraft);
    } catch {
      requestMessage('Seu navegador não conseguiu salvar a tentativa. Libere o armazenamento e tente novamente.', 'error');
      return;
    }
    draft = nextDraft;
  }
  submitting = true;
  updateRequestControls();
  requestMessage('Enviando solicitação…', 'loading');
  try {
    const { data, error } = await sendRequest(draft.pending);
    if (sessionUser?.id !== submittedBy) return;
    if (error?.code === '23514') {
      const editableDraft = { form: draft.form, items: draft.items, step: 2 };
      saveDraft(submittedBy, editableDraft);
      draft = editableDraft;
      step = 2;
      requestMessage('Confira os dados do evento e os materiais do catálogo antes de enviar novamente.', 'error');
      return;
    }
    if (error || !data) throw error ?? new Error('Resposta sem confirmação');
    clearDraft(submittedBy);
    draft = {};
    find('request').hidden = true;
    find('done').hidden = false;
    const receipt = find('request-receipt');
    receipt.textContent = 'Identificador da solicitação: ' + data;
    receipt.hidden = false;
    find('done-title').focus();
  } catch (error) {
    if (sessionUser?.id !== submittedBy) return;
    requestMessage(['PGRST202', 'P0002'].includes(error.code)
      ? 'O recebimento de orçamentos está indisponível no momento.'
      : 'O envio ainda não foi confirmado. Tente confirmar o mesmo pedido novamente.', 'error');
  } finally {
    submitting = false;
    updateRequestControls();
    if (sessionUser?.id === submittedBy && draft.pending && !find('request').hidden) requestButton.focus();
  }
});

if (auth) {
  if (authMode === 'signup' || portalEntry) showAuthMode();
  auth.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && (callback || recoveryLink) && session) {
      recoveryLink = true;
      authMode = 'reset';
      showAuthMode();
      passwordField.focus();
    }
    renderSession(session?.user ?? null);
    if (event === 'INITIAL_SESSION') {
      if (callback) {
        try {
          localStorage.removeItem(authReturnKey);
        } catch {
          // An unavailable browser store does not block sign-in.
        }
      }
      authButton.disabled = false;
      authSwitch.disabled = false;
      authRecover.disabled = false;
      if (recoveryLink && authMode !== 'reset') {
        authMode = 'recover';
        showAuthMode();
        authMessage('Se o link não abrir a escolha de uma nova senha, solicite outro neste navegador.');
      }
    }
  });
} else {
  authMessage('O acesso ao orçamento está indisponível no momento.', 'error');
}
