begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(23);

insert into auth.users (id, email, email_confirmed_at) values
  ('71000000-0000-0000-0000-000000000001', 'confirmed@example.test', now()),
  ('71000000-0000-0000-0000-000000000002', 'owner@example.test', now()),
  ('71000000-0000-0000-0000-000000000003', 'admin@example.test', now()),
  ('71000000-0000-0000-0000-000000000004', 'member@example.test', now()),
  ('71000000-0000-0000-0000-000000000005', 'other@example.test', now()),
  ('71000000-0000-0000-0000-000000000006', 'pending@example.test', null);
insert into public.companies (id, name) values
  ('72000000-0000-0000-0000-000000000001', 'Portal A'),
  ('72000000-0000-0000-0000-000000000002', 'Portal B');
insert into private.website_portals (slug, company_id) values
  ('portal-test-a', '72000000-0000-0000-0000-000000000001');
insert into public.company_members (company_id, user_id, role, status) values
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', 'owner', 'active'),
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000003', 'admin', 'active'),
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000004', 'member', 'active'),
  ('72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000005', 'owner', 'active');
insert into public.catalog_categories (id, company_id, kind, name) values
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'material', 'Testes do portal');
insert into public.catalog_items (id, company_id, kind, name, category_id, quantity, unit, material_cost) values
  ('74000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'material', 'Fita',
   '73000000-0000-0000-0000-000000000001', 10, 'm', 4);
insert into public.catalog_items (id, company_id, kind, name, brand, size, balloon_type, package_quantity, package_price, archived_at) values
  ('74000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'balloon', 'Arquivado', 'Marca', '10', 'Látex', 10, 4, now()),
  ('74000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'balloon', 'Outra empresa', 'Marca', '10', 'Látex', 10, 4, null);
insert into public.website_requests (id, company_id, request_key, customer_name, customer_email, event_type, services, city) values
  ('75000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001',
   '76000000-0000-0000-0000-000000000001', 'Pedido antigo', 'old@example.test', 'outro', array['baloes'], 'Recife');

select ok(not has_function_privilege('anon', 'public.list_website_catalog(text,text,text,integer)', 'execute'),
  'Visitante não pode consultar o catálogo pela RPC');
select ok(not has_function_privilege('authenticated', 'public.submit_website_request(text,uuid,text,text,text[],date,text,text)', 'execute'),
  'Sessão autenticada não pode contornar a validação de materiais');

set local role authenticated;
set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000006';
select throws_ok($$select public.list_website_catalog('portal-test-a', '', '', 0)$$, '42501', null,
  'E-mail não confirmado não consulta o catálogo');
set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000001';
select is((select count(*) from public.list_website_catalog('portal-test-a', '', '', 0)), 1::bigint,
  'O catálogo retorna apenas o item ativo da empresa');
select throws_ok($$select public.submit_website_catalog_request('portal-test-a', gen_random_uuid(), 'Cliente', 'outro',
  array['baloes'], null, 'Recife', '', '[{"id":"74000000-0000-0000-0000-000000000002","quantity":1}]')$$,
  '23514', null, 'Item arquivado não pode ser solicitado');
select throws_ok($$select public.submit_website_catalog_request('portal-test-a', gen_random_uuid(), 'Cliente', 'outro',
  array['baloes'], null, 'Recife', '', '[{"id":"74000000-0000-0000-0000-000000000003","quantity":1}]')$$,
  '23514', null, 'Item de outra empresa não pode ser solicitado');
select ok(public.submit_website_catalog_request('portal-test-a', '76000000-0000-0000-0000-000000000002', 'Cliente', 'outro',
  array['baloes'], null, 'Recife', '', '[{"id":"74000000-0000-0000-0000-000000000001","quantity":1.25}]') is not null,
  'RPC atual aceita a quantidade fracionária e chama a função interna');
select ok(public.submit_website_catalog_request('portal-test-a', '76000000-0000-0000-0000-000000000002', 'Cliente', 'outro',
  array['baloes'], null, 'Recife', '', '[{"id":"74000000-0000-0000-0000-000000000001","quantity":1.25}]') is not null,
  'Repetição recupera a confirmação do mesmo pedido');
select is((select count(id) from public.website_requests), 0::bigint, 'Cliente não lista pedidos');

set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000003';
select is((select count(id) from public.website_requests), 0::bigint, 'Administrador não lista pedidos');
set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000004';
select is((select count(id) from public.website_requests), 0::bigint, 'Membro não lista pedidos');
set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000005';
select is((select count(id) from public.quote_clients), 0::bigint, 'Empresa de fora não vê o cadastro criado pelo site');
select throws_ok($$select public.manage_website_request('72000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000001', 'reviewing')$$, '42501', null, 'Proprietário de outra empresa não muda o estado');
set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000002';
select is((select count(id) from public.website_requests), 2::bigint, 'Proprietário vê o pedido antigo e o único pedido novo');
select is((select (catalog_items->0->>'quantity')::numeric from public.website_requests where catalog_items is not null),
  1.25::numeric, 'O pedido guarda a quantidade enviada');
select is((select count(id) from public.quote_clients), 1::bigint, 'O envio e a repetição registram um único cliente');
select is((select count(id) from public.quotes), 0::bigint, 'O envio deixa a criação do orçamento para a equipe');
select is((select client_id from public.website_requests where catalog_items is not null),
  (select id from public.quote_clients), 'O envio já vincula o pedido ao cadastro');
select lives_ok($$select public.manage_website_request('72000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000001', 'reviewing')$$, 'Proprietário inicia a análise de um pedido antigo');
select is((select status from public.website_requests where id = '75000000-0000-0000-0000-000000000001'),
  'reviewing', 'O pedido muda para Em análise');

set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000001';
select ok(public.submit_website_catalog_request_v2('portal-test-a', gen_random_uuid(), 'Cliente', 'outro',
  array['baloes'], null, 'Recife', '', '[{"id":"74000000-0000-0000-0000-000000000001","quantity":1}]',
  '{"whatsapp":"81999990000"}') is not null, 'Cliente envia um segundo pedido com WhatsApp');
set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000002';
select is((select count(id) from public.quote_clients), 1::bigint, 'Um novo pedido da mesma conta reaproveita o cadastro');
select is((select whatsapp from public.client_details('72000000-0000-0000-0000-000000000001',
  (select id from public.quote_clients))), '81999990000', 'O envio preenche o WhatsApp ausente no cadastro');

select * from finish();
rollback;
