begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(37);

insert into auth.users(id,email,email_confirmed_at) values
 ('11000000-0000-0000-0000-000000000081','owner-portal@example.test',now()),
 ('11000000-0000-0000-0000-000000000082','admin-portal@example.test',now()),
 ('11000000-0000-0000-0000-000000000083','member-portal@example.test',now()),
 ('11000000-0000-0000-0000-000000000084','client-portal@example.test',now()),
 ('11000000-0000-0000-0000-000000000085','other-portal@example.test',now());
insert into public.companies(id,name) values
 ('22000000-0000-0000-0000-000000000081','A'),('22000000-0000-0000-0000-000000000082','B');
insert into public.company_members(company_id,user_id,role,status) values
 ('22000000-0000-0000-0000-000000000081','11000000-0000-0000-0000-000000000081','owner','active'),
 ('22000000-0000-0000-0000-000000000081','11000000-0000-0000-0000-000000000082','admin','active'),
 ('22000000-0000-0000-0000-000000000081','11000000-0000-0000-0000-000000000083','member','active'),
 ('22000000-0000-0000-0000-000000000082','11000000-0000-0000-0000-000000000081','owner','active');
insert into private.website_portals values ('qa-portal','22000000-0000-0000-0000-000000000081');
insert into public.catalog_items(id,company_id,kind,name,brand,size,balloon_type,package_quantity,package_price)
values('33000000-0000-0000-0000-000000000081','22000000-0000-0000-0000-000000000081','balloon','Balão','Marca','10','Látex',10,1);
insert into public.website_requests(id,company_id,customer_id,request_key,customer_name,customer_email,event_type,services,city)
values
 ('44000000-0000-0000-0000-000000000081','22000000-0000-0000-0000-000000000081','11000000-0000-0000-0000-000000000084',gen_random_uuid(),'Cliente','client-portal@example.test','casamento','{baloes}','Olinda'),
 ('44000000-0000-0000-0000-000000000082','22000000-0000-0000-0000-000000000081',null,gen_random_uuid(),'Legado','client-portal@example.test','casamento','{baloes}','Recife'),
 ('44000000-0000-0000-0000-000000000083','22000000-0000-0000-0000-000000000081','11000000-0000-0000-0000-000000000085',gen_random_uuid(),'Outro','other-portal@example.test','casamento','{baloes}','Brasília');
insert into public.quotes(id,company_id,title,status,event_date,location,source_request_id)
values('55000000-0000-0000-0000-000000000081','22000000-0000-0000-0000-000000000081','Casamento','ready','2030-06-01','Salão','44000000-0000-0000-0000-000000000081');
insert into public.commercial_proposals(id,company_id,quote_id,version,token_hash,content,image_paths,sent_at,expires_at)
values('66000000-0000-0000-0000-000000000081','22000000-0000-0000-0000-000000000081','55000000-0000-0000-0000-000000000081',1,
 sha256(convert_to(repeat('a',64),'UTF8')),'{"title":"Casamento","total":"15000","totalCost":"5000","materials":[{"name":"Balão","quantity":"2","unitCost":100}]}','{}',now(),now()+interval '2 days');

set local role anon;
select throws_ok('select public.customer_portal_summary()', '42501', null, 'Visitante não consulta o portal');
set local role authenticated;
set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000084';
select is((select count(*) from public.company_members),0::bigint,'Cadastro de cliente não cria vínculo');
select throws_ok($$select public.create_company('Promoção indevida')$$,'42501',null,'Cliente não pode se tornar proprietário');
select is((select count(*) from public.customer_requests()),1::bigint,'Cliente vê apenas pedido da sua identidade');
select is(public.customer_request('44000000-0000-0000-0000-000000000082'),null::jsonb,'Coincidência de e-mail não dá acesso ao legado');
select is(public.customer_request('44000000-0000-0000-0000-000000000083'),null::jsonb,'Pedido de outro cliente fica indisponível');
select ok(not (public.customer_request('44000000-0000-0000-0000-000000000081')#>'{proposals,0,content}' ? 'totalCost'),
 'Portal exclui custo interno mesmo de snapshot fora do padrão');
select ok(not (public.customer_request('44000000-0000-0000-0000-000000000081')#>'{proposals,0,content,materials,0}' ? 'unitCost'),
 'Portal exclui custo unitário');
select is(public.respond_customer_proposal('66000000-0000-0000-0000-000000000081','approved',null)->>'decision','approved','Cliente responde proposta própria');
select is((select count(*) from public.customer_events()),0::bigint,'Aceitar proposta não confirma evento');
select throws_ok($$select public.set_customer_event_confirmation('22000000-0000-0000-0000-000000000081','55000000-0000-0000-0000-000000000081',true)$$,
 '42501',null,'Cliente não confirma eventos');
select throws_ok($$select public.customer_proposal_pdf_source('11000000-0000-0000-0000-000000000084','66000000-0000-0000-0000-000000000081')$$,
 '42501',null,'Credenciais do PDF não podem ser usadas diretamente pelo cliente');

set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000085';
select throws_ok($$select public.respond_customer_proposal('66000000-0000-0000-0000-000000000081','approved',null)$$,
 '42501',null,'Outro cliente não responde à proposta');
set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000083';
select throws_ok($$select public.list_company_team('22000000-0000-0000-0000-000000000081',0)$$,
 '42501',null,'Membro não consulta e-mails da equipe');
select throws_ok($$select public.issue_company_invitation('22000000-0000-0000-0000-000000000081','client-portal@example.test','member')$$,
 '42501',null,'Membro não convida');
select throws_ok($$select public.set_catalog_website_visibility('22000000-0000-0000-0000-000000000081','33000000-0000-0000-0000-000000000081',false)$$,
 '42501',null,'Membro não retira produtos do site');

set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000082';
select is((select count(*) from public.list_company_team('22000000-0000-0000-0000-000000000081',0)),3::bigint,
 'Administrador consulta só os vínculos da sua empresa');
select throws_ok($$select public.list_company_team('22000000-0000-0000-0000-000000000082',0)$$,
 '42501',null,'Administrador não consulta equipe de outra empresa');
select throws_ok($$select public.issue_company_invitation('22000000-0000-0000-0000-000000000081','client-portal@example.test','admin')$$,
 '42501',null,'Administrador não convida como administrador');
select lives_ok($$select public.set_customer_event_confirmation('22000000-0000-0000-0000-000000000081','55000000-0000-0000-0000-000000000081',true)$$,
 'Administrador confirma evento explicitamente');
select lives_ok($$select public.set_catalog_website_visibility('22000000-0000-0000-0000-000000000081','33000000-0000-0000-0000-000000000081',false)$$,
 'Administrador pode retirar produto do site');
select is((select count(id) from public.catalog_items where id='33000000-0000-0000-0000-000000000081'),1::bigint,'Produto oculto continua no catálogo interno');

set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000081';
select set_config('test.invite_a',public.issue_company_invitation('22000000-0000-0000-0000-000000000081','client-portal@example.test','admin'),true) is not null;
select set_config('test.invite_b',public.issue_company_invitation('22000000-0000-0000-0000-000000000082','client-portal@example.test','member'),true) is not null;
set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000085';
select throws_ok($$select public.accept_company_invitation(current_setting('test.invite_a'))$$,'42501',null,'Convite exige e-mail autenticado correspondente');
set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000084';
select is((select count(*) from public.customer_events()),1::bigint,'Confirmação explícita aparece para o cliente');
select is((select count(*) from public.list_website_catalog('qa-portal','','',0)),0::bigint,'Produto oculto some da vitrine');
select lives_ok($$select public.accept_company_invitation(current_setting('test.invite_a'))$$,'Cliente aceita convite que concede vínculo administrativo autorizado');
select lives_ok($$select public.accept_company_invitation(current_setting('test.invite_b'))$$,'A mesma conta pode ter vínculo em outra empresa');
select is((select count(*) from public.company_members where user_id=auth.uid() and status='active'),2::bigint,'Dois vínculos ativos persistidos');
select throws_ok($$select public.accept_company_invitation(current_setting('test.invite_a'))$$,'42501',null,'Não aceita o mesmo token duas vezes');

select is(public.can_issue_customer_claim('44000000-0000-0000-0000-000000000082'),false,'Administrador não libera acesso a pedido antigo');
select throws_ok($$select public.issue_customer_request_claim('44000000-0000-0000-0000-000000000082')$$,
 '42501',null,'Não cria link por chamada direta sem ser proprietário');
set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000081';
select is(public.can_issue_customer_claim('44000000-0000-0000-0000-000000000082'),true,'Proprietário pode revisar e emitir vínculo');
select throws_ok($$select public.issue_customer_request_claim('44000000-0000-0000-0000-000000000081')$$,
 '42501',null,'Proprietário não sobrescreve vínculo existente');
select set_config('test.claim',public.issue_customer_request_claim('44000000-0000-0000-0000-000000000082'),true) is not null;
set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000085';
select throws_ok($$select public.accept_customer_request_claim(current_setting('test.claim'))$$,'42501',null,'Token vazado não vincula a outra identidade');
set local request.jwt.claim.sub='11000000-0000-0000-0000-000000000084';
select is(public.accept_customer_request_claim(current_setting('test.claim')),'44000000-0000-0000-0000-000000000082'::uuid,'Destinatário verificado aceita o vínculo');
select is((select count(*) from public.customer_requests()),2::bigint,'Cliente passa a consultar o pedido vinculado');
select throws_ok($$select public.accept_customer_request_claim(current_setting('test.claim'))$$,'42501',null,'Link é de uso único');

select * from finish();
rollback;
