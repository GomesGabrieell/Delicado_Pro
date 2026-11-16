begin;

alter table public.website_requests add constraint website_requests_company_id_key unique (company_id,id);
alter table public.quotes add column source_request_id uuid unique,
  add constraint quote_website_request_company_fk foreign key (company_id,source_request_id)
    references public.website_requests(company_id,id);

create table public.website_request_history (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  request_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('new','reviewing','closed')),
  happened_at timestamptz not null default clock_timestamp(),
  foreign key (company_id,request_id) references public.website_requests(company_id,id) on delete cascade
);
create index website_request_history_lookup on public.website_request_history(company_id,request_id,id);
alter table public.website_request_history enable row level security;
revoke all on public.website_request_history from public, anon, authenticated;
grant select (id,company_id,request_id,status,happened_at) on public.website_request_history to authenticated;
create policy website_request_history_owner_read on public.website_request_history for select to authenticated
  using (private.has_company_access(company_id,'website_requests.manage'));

create function private.audit_website_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.website_request_history(company_id,request_id,actor_id,status)
      values(new.company_id,new.id,auth.uid(),new.status);
  end if;
  return new;
end;
$$;
revoke all on function private.audit_website_request() from public,anon,authenticated;
create trigger website_request_state_audit after insert or update of status on public.website_requests
  for each row execute function private.audit_website_request();

create function public.convert_website_request(p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  request public.website_requests;
  draft_quote uuid;
  draft_version timestamptz;
  contact_ids uuid[];
  client_id uuid;
  formatted_name text;
  contact_email text;
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

  contact_email := lower(request.customer_email);
  -- Serialize conversions for the same verified contact within this company.
  perform pg_advisory_xact_lock(hashtextextended(request.company_id::text || ':' || contact_email, 0));
  select array_agg(match.id) into contact_ids from (
    select c.id from public.quote_clients c where c.company_id = request.company_id
      and lower(c.email) = contact_email and c.archived_at is null order by c.id limit 2
  ) match;
  if cardinality(contact_ids) > 1 then
    raise exception 'Mais de um cliente ativo com o e-mail verificado' using errcode = '21000';
  end if;
  client_id := contact_ids[1];
  if client_id is null then
    if contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
      contact_email := null;
    end if;
    formatted_name := btrim(request.customer_name);
    insert into public.quote_clients(company_id,name,email,whatsapp)
      values(request.company_id,formatted_name,contact_email,nullif(request.contact_details->>'whatsapp',''))
      on conflict do nothing returning id into client_id;
    if client_id is null then
      -- Preserve distinct customers who happen to have the same name.
      formatted_name := left(formatted_name, 109) || ' · ' || left(request.id::text,8);
      insert into public.quote_clients(company_id,name,email,whatsapp)
        values(request.company_id,formatted_name,contact_email,nullif(request.contact_details->>'whatsapp',''))
        returning id into client_id;
    end if;
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
    values(request.company_id,client_id,left(title || ' · ' || request.customer_name,120),request.event_date,
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
