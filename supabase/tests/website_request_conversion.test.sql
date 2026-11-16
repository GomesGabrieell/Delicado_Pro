begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(18);

insert into auth.users(id,email,email_confirmed_at) values
 ('81000000-0000-0000-0000-000000000001','lead@example.test',now()),
 ('81000000-0000-0000-0000-000000000002','owner@example.test',now()),
 ('81000000-0000-0000-0000-000000000003','other@example.test',now());
insert into public.companies(id,name) values ('82000000-0000-0000-0000-000000000001','A'),('82000000-0000-0000-0000-000000000002','B');
insert into public.company_members(company_id,user_id,role,status) values
 ('82000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','owner','active'),
 ('82000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000003','owner','active');
insert into private.website_portals values ('vitrine-qa','82000000-0000-0000-0000-000000000001');
insert into public.catalog_items(id,company_id,kind,name,brand,size,balloon_type,package_quantity,package_price) values
 ('83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','balloon','Balão','Marca','10','Látex',10,1),
 ('83000000-0000-0000-0000-000000000002','82000000-0000-0000-0000-000000000001','balloon','Balão 2','Marca','10','Látex',10,1);
insert into public.quote_clients(company_id,name,email) values
 ('82000000-0000-0000-0000-000000000001','Outro nome para o mesmo cliente','lead@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '81000000-0000-0000-0000-000000000001';
select throws_ok($$select public.submit_website_catalog_request_v2('vitrine-qa',gen_random_uuid(),'Cliente','casamento',
 array['baloes'],null,'Recife','','[]','{"guests":2.5}')$$,'23514',null,'Recusa convidados fracionários');
select throws_ok($$select public.submit_website_catalog_request_v2('vitrine-qa',gen_random_uuid(),'Cliente','casamento',
 array['baloes'],null,'Recife','','[]','{"company_id":"outro"}')$$,'23514',null,'Recusa dados adicionais não permitidos');
select set_config('test.request',public.submit_website_catalog_request_v2('vitrine-qa','84000000-0000-0000-0000-000000000001',
 'Cliente','casamento',array['baloes'],'2028-06-01','Recife','nota interna',
 '[{"id":"83000000-0000-0000-0000-000000000001","quantity":2},{"id":"83000000-0000-0000-0000-000000000002","quantity":1}]',
 '{"venue":"Salão","guests":45,"whatsapp":"81999990000","inspiration":"Lavanda","notes":"Confidencial"}')::text,true) is not null;
select is(public.submit_website_catalog_request_v2('vitrine-qa','84000000-0000-0000-0000-000000000001',
 'Cliente','casamento',array['baloes'],'2028-06-01','Recife','',
 '[{"id":"83000000-0000-0000-0000-000000000001","quantity":2}]','{"venue":"Outro salão"}')::text,
 current_setting('test.request'),'Reenvio recupera o mesmo pedido');
select is((select count(id) from public.website_requests),0::bigint,'Cliente não pode listar solicitações');
select throws_ok($$select public.convert_website_request(current_setting('test.request')::uuid)$$,'42501',null,'Cliente não converte');
reset role;
update public.catalog_items set archived_at = now() where id = '83000000-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claim.sub = '81000000-0000-0000-0000-000000000003';
select throws_ok($$select public.convert_website_request(current_setting('test.request')::uuid)$$,'42501',null,'Outra empresa não converte');
select is((select count(id) from public.website_request_history),0::bigint,'Outra empresa não lê histórico');
set local request.jwt.claim.sub = '81000000-0000-0000-0000-000000000002';
select set_config('test.quote',public.convert_website_request(current_setting('test.request')::uuid)::text,true) is not null;
select is(public.convert_website_request(current_setting('test.request')::uuid)::text,current_setting('test.quote'),'Conversão é idempotente');
select is((select count(id) from public.quotes),1::bigint,'Um único orçamento');
select is((select count(id) from public.quote_clients),1::bigint,'Reutiliza cliente pelo e-mail verificado');
select is((select client_id from public.quotes),(select client_id from public.website_requests),
 'O orçamento usa o cadastro vinculado no recebimento');
select is((select source_request_id::text from public.quotes),current_setting('test.request'),'Rastreia o pedido original');
select is((select status from public.quotes),'draft','Fase interna preservada');
select is((select items->0->>'quantity' from public.quotes),'2','Quantidade ativa transferida');
select is((select jsonb_array_length(items) from public.quotes),1,'Item arquivado permanece no pedido, fora da composição');
select is((select contact_details->>'venue' from public.website_requests),'Salão','Reenvio não sobrescreve detalhes');
select is((select count(id) from public.website_request_history),2::bigint,'Recebimento e início da análise registrados');
select ok((select decoration not like '%Confidencial%' and decoration like '%Lavanda%' from public.quotes),
 'Somente serviços e inspirações integram o texto comercial');
select * from finish();
rollback;
