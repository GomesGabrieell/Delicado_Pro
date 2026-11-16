import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const code = await readFile(new URL('../public-proposal/orcamento.js', import.meta.url), 'utf8');
const sessionCode = await readFile(new URL('../public-proposal/portal-session.js', import.meta.url), 'utf8');

function browser(responses, rejectRemoval = false) {
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', hidden: id === 'done', handlers: new Map(),
      addEventListener(event, handler) { this.handlers.set(event, handler); },
      focus() {}, reset() {}, replaceChildren() {}, setAttribute() {},
    });
    return nodes.get(id);
  }

  const initial = {
    form: { name: 'Cliente', event: 'casamento', city: 'São Paulo', date: '', details: '', services: ['baloes'] },
    items: [{ id: 'item', kind: 'balloon', name: 'Balão', quantity: '2' }],
  };
  let stored = JSON.stringify(initial);
  const submitted = [];
  const requestForm = element('request-form');
  const service = { value: 'baloes', checked: true, closest: () => ({ textContent: 'Balões' }) };
  const formField = (name) => element('field:' + name);
  formField('event').options = [{ value: 'casamento' }];
  requestForm.elements = { namedItem: formField };
  requestForm.querySelectorAll = () => [service];
  requestForm.querySelector = () => service;
  element('auth-form').elements = { namedItem: formField };

  let observeSession;
  const session = { user: { id: 'customer', email: 'customer@example.test' } };
  const context = {
    document: { getElementById: element, createElement: () => ({}), querySelector: () => element('link') },
    location: { search: '' }, window: { addEventListener() {} }, URLSearchParams, crypto,
    FormData: class {
      get(key) { return formField(key).value; }
      getAll() { return service.checked ? ['baloes'] : []; }
    },
    delicadoConfig: { portal: 'test', url: 'https://example.test', key: 'sb_publishable_test' },
    sessionStorage: {
      getItem: () => stored,
      setItem: (_key, value) => { stored = value; },
      removeItem: () => { if (rejectRemoval) throw new Error('Storage unavailable'); stored = '{}'; },
    },
    supabase: { createClient: () => ({
      auth: { onAuthStateChange(listener) { observeSession = listener; } },
      async rpc(name, payload) {
        assert.equal(name, 'submit_website_catalog_request_v2');
        submitted.push(structuredClone(payload));
        return responses.shift();
      },
    }) },
  };
  function load() {
    const script = sessionCode.replace(/^export /gm, '') + '\nconst auth = portalClient;\n' + code.replace(/^import .*?;\r?\n/, '');
    vm.runInNewContext(script, { ...context });
    observeSession('INITIAL_SESSION', session);
  }
  function submit() { return requestForm.handlers.get('submit')({ preventDefault() {} }); }
  return { element, formField, load, submit, submitted, draft: () => JSON.parse(stored) };
}

test('repete o mesmo conteúdo e a mesma chave depois de recarregar com confirmação pendente', async () => {
  const page = browser([{ error: { code: '' } }, { data: 'request-id' }]);
  page.load();
  await page.submit();
  assert.equal(page.element('edit-event').disabled, true);
  assert.equal(page.element('done').hidden, true);

  page.load();
  page.formField('city').value = 'Outra cidade';
  await page.submit();
  assert.deepEqual(page.submitted[1], page.submitted[0]);
  assert.equal(page.element('done').hidden, false);
});

test('permite corrigir a seleção quando o servidor rejeita explicitamente os dados', async () => {
  const page = browser([{ error: { code: '23514' } }, { data: 'request-id' }]);
  page.load();
  await page.submit();
  assert.equal(page.element('edit-event').disabled, false);
  assert.equal(page.draft().pending, undefined);

  page.formField('city').value = 'Campinas';
  await page.submit();
  await page.submit();
  await page.submit();
  assert.notEqual(page.submitted[1].p_request_key, page.submitted[0].p_request_key);
  assert.equal(page.submitted[1].p_city, 'Campinas');
});

test('mantém a confirmação quando o rascunho permanece no armazenamento após o envio', async () => {
  const page = browser([{ data: 'request-id' }], true);
  page.load();
  await page.submit();
  assert.equal(page.element('done').hidden, false);
  assert.equal(page.draft().pending.p_request_key, page.submitted[0].p_request_key);
});
