begin;

alter table public.website_requests add column client_id uuid,
  add constraint website_request_client_company_fk foreign key (company_id,client_id)
    references public.quote_clients(company_id,id) on delete set null (client_id);
grant select (client_id) on public.website_requests to authenticated;

create function private.resolve_website_request_client(p_request public.website_requests)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  contact_email text := lower(btrim(p_request.customer_email));
  contact_phone text := nullif(p_request.contact_details->>'whatsapp','');
  contact_ids uuid[];
  linked_client uuid;
  formatted_name text := btrim(p_request.customer_name);
begin
  if contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    contact_email := null;
  end if;
  if contact_phone !~ '^[0-9]{10,15}$' then
    contact_phone := null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_request.company_id::text || ':' || coalesce(contact_email,p_request.id::text), 0));

  if p_request.customer_id is not null then
    select r.client_id into linked_client
      from public.website_requests r
      join public.quote_clients c on c.company_id = r.company_id and c.id = r.client_id
      where r.company_id = p_request.company_id and r.customer_id = p_request.customer_id
        and c.archived_at is null
      order by r.created_at desc, r.id desc limit 1;
  end if;

  if linked_client is null and contact_email is not null then
    select array_agg(candidate.id) into contact_ids from (
      select c.id from public.quote_clients c where c.company_id = p_request.company_id
        and lower(c.email) = contact_email and c.archived_at is null order by c.id limit 2
    ) candidate;
    if cardinality(contact_ids) > 1 and p_request.customer_id is null then
      raise exception 'Mais de um cliente ativo com o e-mail do pedido' using errcode = '21000';
    end if;
    -- Um pedido autenticado com e-mail ambíguo recebe um cadastro próprio.
    if cardinality(contact_ids) = 1 then linked_client := contact_ids[1]; end if;
  end if;

  if linked_client is null then
    insert into public.quote_clients(company_id,name,email,whatsapp)
      values(p_request.company_id,formatted_name,contact_email,contact_phone)
      on conflict do nothing returning id into linked_client;
    if linked_client is null then
      insert into public.quote_clients(company_id,name,email,whatsapp)
        values(p_request.company_id,left(formatted_name,81) || ' · ' || p_request.id::text,contact_email,contact_phone)
        returning id into linked_client;
    end if;
  end if;
  return linked_client;
end;
$$;

create function private.register_website_request_client() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  contact_phone text := new.contact_details->>'whatsapp';
begin
  if new.client_id is null then
    new.client_id := private.resolve_website_request_client(new);
  end if;
  if old.contact_details is null and contact_phone ~ '^[0-9]{10,15}$' then
    update public.quote_clients c set whatsapp = contact_phone, updated_at = clock_timestamp()
      where c.company_id = new.company_id and c.id = new.client_id
        and c.archived_at is null and c.whatsapp is null;
  end if;
  return new;
end;
$$;

revoke all on function private.resolve_website_request_client(public.website_requests),
  private.register_website_request_client() from public,anon,authenticated;

-- O envio com catálogo grava a seleção validada. A RPC v2 complementa o contato na mesma transação.
create trigger website_request_register_client before update of catalog_items,contact_details on public.website_requests
  for each row when (new.customer_id is not null and new.catalog_items is not null
    and (old.catalog_items is null
      or (new.client_id is not null and old.contact_details is null and new.contact_details is not null)))
  execute function private.register_website_request_client();

create or replace function public.convert_website_request(p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  request public.website_requests;
  draft_quote uuid;
  draft_version timestamptz;
  linked_client uuid;
  title text;
  service_description text;
  composition jsonb;
begin
  select r.* into request from public.website_requests r
    where r.id = p_request and private.has_company_access(r.company_id,'website_requests.manage')
    for update;
  if not found then
    raise exception 'Pedido indisponível para conversão' using errcode = '42501';
  end if;

  select q.id into draft_quote from public.quotes q where q.source_request_id = request.id;
  if draft_quote is not null then return draft_quote; end if;

  linked_client := request.client_id;
  if linked_client is null then
    linked_client := private.resolve_website_request_client(request);
    update public.website_requests r set client_id = linked_client where r.id = request.id;
  end if;

  title := case request.event_type
    when 'casamento' then 'Casamento ou noivado'
    when 'aniversario' then 'Aniversário'
    when 'cha' then 'Chá ou comemoração familiar'
    when 'corporativo' then 'Evento corporativo'
    else 'Evento' end;
  select string_agg(case service
    when 'cenario' then 'Painel e cenário'
    when 'baloes' then 'Balões'
    when 'flores' then 'Arranjos florais'
    when 'mesas' then 'Decoração das mesas'
    when 'completa' then 'Decoração completa' end, ', ' order by position)
  into service_description from unnest(request.services) with ordinality as s(service,position);

  insert into public.quotes(company_id,client_id,title,event_date,location,decoration,source_request_id)
    values(request.company_id,linked_client,left(title || ' · ' || request.customer_name,120),request.event_date,
      left(concat_ws(' · ',nullif(request.contact_details->>'venue',''),request.city),240),
      concat_ws(E'\n\n','Serviços solicitados: ' || service_description,nullif(request.contact_details->>'inspiration','')),
      request.id)
    returning id,updated_at into draft_quote,draft_version;

  with available as (
    select item.id, choice.value, choice.position
    from jsonb_array_elements(coalesce(request.catalog_items,'[]'::jsonb)) with ordinality as choice(value,position)
    join public.catalog_items item on item.id = (choice.value->>'id')::uuid
      and item.company_id = request.company_id and item.archived_at is null
    for share of item
  )
  select jsonb_agg(jsonb_build_object('id',id,'quantity',trim_scale((value->>'quantity')::numeric)::text) order by position)
    into composition from available;
  if composition is not null then
    perform public.save_quote_composition(request.company_id,draft_quote,draft_version,composition,null);
  end if;

  insert into public.quote_history(quote_id,company_id,action,status)
    values(draft_quote,request.company_id,'converted_website_request','draft');
  update public.website_requests set status = 'reviewing' where id = request.id and status = 'new';
  return draft_quote;
end;
$$;

revoke all on function public.convert_website_request(uuid) from public,anon,authenticated;
grant execute on function public.convert_website_request(uuid) to authenticated;

commit;
