begin;

create or replace function public.issue_proposal(p_company uuid,p_quote uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare q public.quotes;
declare brand public.proposal_branding;
declare customer text;
declare sale text;
declare token text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
declare now_at timestamptz;
declare proposal_id uuid;
declare revision integer;
declare materials jsonb;
begin
  if not private.has_company_access(p_company,'catalog.write') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  select * into q from public.quotes where id = p_quote and company_id = p_company for update;
  if not found or q.status <> 'ready' then
    raise exception 'O orçamento deve estar pronto para revisão' using errcode = '23514';
  end if;
  select name into customer from public.quote_clients where id = q.client_id and company_id = p_company;
  select snapshot->>'sale' into sale from public.quote_financials where quote_id = q.id and company_id = p_company;
  select * into brand from public.proposal_branding where company_id = p_company;
  if brand.whatsapp is null then raise exception 'Configure o WhatsApp da empresa' using errcode = '23514'; end if;
  if customer is null or sale is null or sale !~ '^[0-9]{1,30}$' or btrim(q.decoration) = '' or btrim(q.payment_terms) = '' then
    raise exception 'Preencha decoração e pagamento e registre o cálculo' using errcode = '23514';
  end if;
  select coalesce(max(version),0) + 1 into revision from public.commercial_proposals where quote_id = q.id;
  select coalesce(jsonb_agg(jsonb_build_object('name',entry.value->>'name',
    'quantity',entry.value->>'quantity','unit',entry.value->>'unit') order by entry.position),'[]'::jsonb)
    into materials from jsonb_array_elements(q.items) with ordinality as entry(value,position);
  now_at := clock_timestamp();
  update public.commercial_proposals set revoked_at = now_at
    where quote_id = q.id and revoked_at is null and responded_at is null;
  insert into public.commercial_proposals(company_id,quote_id,version,issued_by,token_hash,content,image_paths,sent_at,expires_at)
  values(p_company,q.id,revision,auth.uid(),sha256(convert_to(token,'UTF8')),
    jsonb_build_object('company',brand.display_name,'accent',brand.accent,'whatsapp',brand.whatsapp,
      'code',q.code,'title',q.title,'customer',customer,'eventDate',q.event_date,'location',q.location,
      'decoration',q.decoration,'payment',q.payment_terms,'total',sale,'materials',materials),
    array(select path from public.quote_images where company_id = p_company and quote_id = q.id order by path),
    now_at,now_at + interval '48 hours') returning id into proposal_id;
  insert into public.quote_history(quote_id,company_id,action,status) values(q.id,p_company,'proposal_issued',q.status);
  return jsonb_build_object('id',proposal_id,'token',token);
end;
$$;

commit;
