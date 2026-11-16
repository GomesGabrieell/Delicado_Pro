import { endpoint } from './config.js';

const token = location.hash.slice(1);
const el = (id) => document.getElementById(id);
const put = (id, value) => { el(id).textContent = value ?? ''; };
function feedback(id, message, state) {
  if (state) el(id).dataset.state = state;
  else delete el(id).dataset.state;
  put(id, message);
}
const date = (value) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
}).format(new Date(value));
let proposal;

function setAccent(accent) {
  if (!/^#[a-f0-9]{6}$/i.test(accent)) return;
  const [red, green, blue] = accent.slice(1).match(/../g).map((part) => {
    const channel = parseInt(part, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const style = el('proposal').style;
  const darkText = luminance > 0.179;
  style.setProperty('--proposal-accent', accent);
  style.setProperty('--proposal-action-text', darkText ? '#000' : '#fff');
  style.setProperty('--proposal-hover-target', darkText ? '#fff' : '#000');
}

async function request(action, details = {}) {
  const response = await fetch(endpoint, {
    method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
    cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action, ...details }),
  }).catch(() => {
    throw new Error('O portal está temporariamente indisponível. Tente novamente em alguns instantes.');
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const unavailable = response.status >= 500 || data.code === 'NOT_FOUND';
    const error = new Error(unavailable
      ? 'O portal está temporariamente indisponível. Tente novamente em alguns instantes.'
      : data.error || 'Não foi possível acessar a proposta.');
    error.status = unavailable ? 503 : response.status;
    throw error;
  }
  return action === 'pdf' ? response.blob() : response.json();
}

function showResponse(result) {
  el('actions').hidden = true;
  el('revision').hidden = true;
  feedback('response', result.decision === 'approved'
    ? 'Aprovação registrada em ' + date(result.respondedAt) + '. A resposta está disponível para a empresa.'
    : result.decision === 'negotiate' ? 'Seu pedido de alterações foi registrado. Você também pode conversar pelo WhatsApp.'
      : 'Agradecemos pelo seu retorno e pela oportunidade de apresentar nossa proposta.'
        + (result.wantsRevision ? ' Seu pedido de uma nova proposta foi registrado.' : ''), 'success');
  el('whatsapp').hidden = result.decision !== 'negotiate' || !el('whatsapp').hasAttribute('href');
}

async function load() {
  el('retry').hidden = true;
  if (!token) return;
  if (!/^[a-f0-9]{64}$/.test(token)) {
    feedback('notice', 'Este link está incompleto. Abra o link original que você recebeu da empresa.', 'error');
    return;
  }
  feedback('notice', 'Carregando sua proposta…', 'loading');
  proposal = await request('read');
  const c = proposal.content;
  setAccent(c.accent);
  for (const key of ['company','title','customer','decoration','payment']) put(key, c[key]);
  put('code', 'Proposta ' + c.code + ' · Versão ' + proposal.version);
  put('event', [c.eventDate?.split('-').reverse().join('/'), c.location].filter(Boolean).join(' · '));
  const digits = c.total.padStart(3, '0');
  put('total', 'R$ ' + digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + digits.slice(-2));
  put('expiry', 'Válida até ' + date(proposal.expiresAt) + ' (horário de Brasília)');
  const materials = Array.isArray(c.materials) ? c.materials : [];
  el('proposal-materials').hidden = !materials.length;
  el('material-lines').replaceChildren(...materials.map((item) => {
    const line = document.createElement('li');
    line.textContent = [item.name, [item.quantity, item.unit].filter(Boolean).join(' ')].join(' · ');
    return line;
  }));
  if (/^[1-9]\d{9,14}$/.test(c.whatsapp)) {
    el('whatsapp').href = 'https://wa.me/' + c.whatsapp + '?text='
      + encodeURIComponent('Olá! Gostaria de negociar a proposta ' + c.code + '.');
  }
  el('references').hidden = !proposal.images.length;
  proposal.images.forEach((url, index) => {
    const image = document.createElement('img');
    image.src = url;
    image.alt = 'Referência de decoração ' + (index + 1);
    image.decoding = 'async';
    if (index > 0) image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    el('images').append(image);
  });
  if (proposal.decision) showResponse(proposal);
  el('entrance').hidden = true;
  el('proposal').hidden = false;
}

el('decline').onclick = () => {
  el('actions').hidden = true;
  el('revision').hidden = false;
  el('revision').querySelector('button').focus();
};
for (const link of document.querySelectorAll('[data-section]')) link.onclick = (event) => {
  event.preventDefault();
  const section = el(link.dataset.section);
  section.scrollIntoView({ block: 'start' });
  if (section.hasAttribute('tabindex')) section.focus({ preventScroll: true });
};
el('cancel').onclick = () => {
  el('revision').hidden = true;
  el('actions').hidden = false;
  el('decline').focus();
};
const decisions = [...document.querySelectorAll('[data-choice]')];
const responseButtons = [...el('history').querySelectorAll('button')];
for (const button of decisions) button.onclick = async () => {
  responseButtons.forEach((item) => { item.disabled = true; });
  feedback('response', 'Registrando resposta…', 'loading');
  try {
    const decision = button.dataset.choice;
    showResponse(await request('respond', {
      decision, wantsRevision: decision === 'declined' ? button.dataset.revision === 'yes' : null,
    }));
    el('history').focus({ preventScroll: true });
  } catch (error) {
    feedback('response', error.message, 'error');
    if (error.status === 409 || error.status === 404) {
      el('actions').hidden = true;
      el('revision').hidden = true;
    }
  } finally {
    responseButtons.forEach((item) => { item.disabled = false; });
  }
};
el('pdf').onclick = async () => {
  el('pdf').disabled = true;
  feedback('pdfStatus', 'Preparando PDF…', 'loading');
  try {
    const url = URL.createObjectURL(await request('pdf'));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'proposta-' + proposal.content.code + '.pdf';
    link.click();
    feedback('pdfStatus', '');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    feedback('pdfStatus', error.message, 'error');
  } finally {
    el('pdf').disabled = false;
  }
};
function openProposal() {
  load().catch((error) => {
    feedback('notice', error.status === 404
      ? 'Esta proposta está indisponível. Solicite um novo link à empresa que enviou a proposta.'
      : error.message, 'error');
    el('retry').hidden = error.status === 404;
  });
}

el('retry').onclick = openProposal;
openProposal();
