begin;

alter table public.profiles add column phone text check (phone ~ '^[+]?[0-9]{10,15}$');
grant insert (phone), update (phone) on public.profiles to authenticated;
create index website_requests_customer_recent on public.website_requests(customer_id,created_at desc,id desc)
  where customer_id is not null;

create table public.customer_event_confirmations (
  quote_id uuid primary key,
  company_id uuid not null,
  title text not null,
  event_date date not null,
  location text not null,
  confirmed_at timestamptz not null default clock_timestamp(),
  confirmed_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  foreign key (company_id,quote_id) references public.quotes(company_id,id) on delete cascade
);
alter table public.customer_event_confirmations enable row level security;
revoke all on public.customer_event_confirmations from public,anon,authenticated;

create function public.set_customer_event_confirmation(p_company uuid,p_quote uuid,p_confirmed boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare q public.quotes;
begin
  if not private.has_company_access(p_company,'catalog.write') then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  select * into q from public.quotes where company_id=p_company and id=p_quote for update;
  if not found or q.source_request_id is null or p_confirmed is null then
    raise exception 'Orçamento sem solicitação vinculada' using errcode='23514';
  end if;
  if not p_confirmed then
    update public.customer_event_confirmations set cancelled_at=clock_timestamp()
      where company_id=p_company and quote_id=p_quote and cancelled_at is null;
  else
    if q.status <> 'ready' or q.event_date is null or btrim(q.location)='' or not exists (
      select 1 from public.website_requests r where r.company_id=p_company and r.id=q.source_request_id and r.customer_id is not null
    ) then
      raise exception 'Confirme somente eventos de orçamentos prontos, com data, local e cliente vinculado' using errcode='23514';
    end if;
    insert into public.customer_event_confirmations(quote_id,company_id,title,event_date,location,confirmed_by)
      values(q.id,q.company_id,q.title,q.event_date,q.location,auth.uid())
      on conflict(quote_id) do update set title=excluded.title,event_date=excluded.event_date,location=excluded.location,
        confirmed_at=clock_timestamp(),confirmed_by=excluded.confirmed_by,cancelled_at=null
      where customer_event_confirmations.cancelled_at is not null
        or (customer_event_confirmations.title,customer_event_confirmations.event_date,customer_event_confirmations.location)
           is distinct from (excluded.title,excluded.event_date,excluded.location);
  end if;
end;
$$;

create function public.customer_events() returns table (request_id uuid,title text,event_date date,location text)
language sql stable security definer set search_path = '' as $$
  select r.id,e.title,e.event_date,e.location from public.customer_event_confirmations e
  join public.quotes q on q.company_id=e.company_id and q.id=e.quote_id
  join public.website_requests r on r.company_id=q.company_id and r.id=q.source_request_id
  where private.is_regular_user() and r.customer_id=auth.uid() and e.cancelled_at is null
  order by e.event_date,q.id;
$$;

create function public.customer_requests(p_search text default '',p_status text default '',p_offset integer default 0)
returns table (id uuid,event_type text,event_date date,city text,status text,created_at timestamptz,company text)
language sql stable security definer set search_path = '' as $$
  select r.id,r.event_type,r.event_date,r.city,r.status,r.created_at,c.name
  from public.website_requests r join public.companies c on c.id=r.company_id
  where private.is_regular_user() and r.customer_id=auth.uid()
    and (coalesce(p_status,'')='' or r.status=p_status)
    and (coalesce(btrim(p_search),'')='' or strpos(lower(concat_ws(' ',r.event_type,r.city,c.name)),lower(left(btrim(p_search),100)))>0)
  order by r.created_at desc,r.id desc offset greatest(p_offset,0) limit 21;
$$;

create function private.customer_proposal_rows(p_user uuid)
returns setof public.commercial_proposals language sql stable security definer set search_path = '' as $$
  select p.* from public.commercial_proposals p
  join public.quotes q on q.company_id=p.company_id and q.id=p.quote_id
  join public.website_requests r on r.company_id=q.company_id and r.id=q.source_request_id
  where p_user is not null and r.customer_id=p_user;
$$;

create function private.customer_proposal_content(value jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('company',value->'company','accent',value->'accent','whatsapp',value->'whatsapp',
    'code',value->'code','title',value->'title','customer',value->'customer','eventDate',value->'eventDate',
    'location',value->'location','decoration',value->'decoration','payment',value->'payment','total',value->'total',
    'materials',(select coalesce(jsonb_agg(jsonb_build_object('name',m.item->'name','quantity',m.item->'quantity',
       'unit',m.item->'unit') order by m.position),'[]'::jsonb)
      from jsonb_array_elements(case jsonb_typeof(value->'materials') when 'array' then value->'materials' else '[]'::jsonb end)
         with ordinality as m(item,position)));
$$;

create function public.customer_portal_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'requests',(select count(*) from public.website_requests where customer_id=auth.uid()),
    'pending',(select count(*) from private.customer_proposal_rows(auth.uid()) p
      where p.decision is null and p.revoked_at is null and p.expires_at>statement_timestamp()),
    'events',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from (
      select * from public.customer_events() where event_date>=((statement_timestamp() at time zone 'America/Sao_Paulo')::date) limit 3
    ) e))
  where private.is_regular_user();
$$;

create function public.customer_request(p_request uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',r.id,'event_type',r.event_type,'event_date',r.event_date,'city',r.city,
    'status',r.status,'created_at',r.created_at,'company',c.name,'services',r.services,'details',r.details,
    'contact_details',r.contact_details,'catalog_items',coalesce(r.catalog_items,'[]'::jsonb),
    'history',(select coalesce(jsonb_agg(jsonb_build_object('status',h.status,'happened_at',h.happened_at) order by h.id),'[]'::jsonb)
      from public.website_request_history h where h.company_id=r.company_id and h.request_id=r.id),
    'proposals',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.version,'expiresAt',p.expires_at,
      'revokedAt',p.revoked_at,'decision',p.decision,'respondedAt',p.responded_at,'wantsRevision',p.wants_revision,
      'content',private.customer_proposal_content(p.content)) order by p.version desc),'[]'::jsonb)
      from private.customer_proposal_rows(auth.uid()) p join public.quotes q on q.company_id=p.company_id and q.id=p.quote_id
      where q.source_request_id=r.id))
  from public.website_requests r join public.companies c on c.id=r.company_id
  where private.is_regular_user() and r.customer_id=auth.uid() and r.id=p_request;
$$;

create function public.customer_proposals(p_offset integer default 0)
returns table (request_id uuid,version integer,title text,decision text,expires_at timestamptz,revoked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select q.source_request_id,p.version,p.content->>'title',p.decision,p.expires_at,p.revoked_at
  from private.customer_proposal_rows(auth.uid()) p
  join public.quotes q on q.company_id=p.company_id and q.id=p.quote_id
  where private.is_regular_user()
  order by p.sent_at desc,p.id desc offset greatest(p_offset,0) limit 21;
$$;

create function private.record_proposal_response(p_id uuid,p_decision text,p_wants_revision boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.commercial_proposals;
begin
  if p_decision is null or p_decision not in ('approved','negotiate','declined')
    or ((p_decision='declined') <> (p_wants_revision is not null)) then
    raise exception 'Resposta inválida' using errcode='22023';
  end if;
  select * into p from public.commercial_proposals where id=p_id for update;
  if not found or p.revoked_at is not null or p.expires_at<=clock_timestamp() then return null; end if;
  if p.decision is null then
    update public.commercial_proposals set decision=p_decision,wants_revision=p_wants_revision,responded_at=clock_timestamp()
      where id=p.id returning * into p;
  elsif p.decision<>p_decision or p.wants_revision is distinct from p_wants_revision then
    raise exception 'Resposta já registrada' using errcode='23505';
  end if;
  return jsonb_build_object('decision',p.decision,'wantsRevision',p.wants_revision,'respondedAt',p.responded_at);
end;
$$;

create or replace function public.respond_public_proposal(p_token text,p_decision text,p_wants_revision boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare proposal_id uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Resposta inválida' using errcode='22023';
  end if;
  select id into proposal_id from public.commercial_proposals where token_hash=sha256(convert_to(p_token,'UTF8'));
  return private.record_proposal_response(proposal_id,p_decision,p_wants_revision);
end;
$$;

create function public.respond_customer_proposal(p_proposal uuid,p_decision text,p_wants_revision boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_regular_user() or not exists (
    select 1 from private.customer_proposal_rows(auth.uid()) p where p.id=p_proposal
  ) then
    raise exception 'Proposta indisponível' using errcode='42501';
  end if;
  return private.record_proposal_response(p_proposal,p_decision,p_wants_revision);
end;
$$;

create function public.customer_proposal_pdf_source(p_user uuid,p_proposal uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('content',private.customer_proposal_content(p.content),'paths',p.image_paths,'version',p.version,'expiresAt',p.expires_at)
  from private.customer_proposal_rows(p_user) p
  where p.id=p_proposal and p.revoked_at is null and p.expires_at>statement_timestamp();
$$;

revoke all on function private.customer_proposal_rows(uuid),private.customer_proposal_content(jsonb),private.record_proposal_response(uuid,text,boolean),
  public.customer_events(),public.customer_requests(text,text,integer),public.customer_portal_summary(),
  public.customer_request(uuid),public.customer_proposals(integer),public.respond_customer_proposal(uuid,text,boolean),
  public.customer_proposal_pdf_source(uuid,uuid),public.set_customer_event_confirmation(uuid,uuid,boolean)
  from public,anon,authenticated;
grant execute on function public.customer_events(),public.customer_requests(text,text,integer),public.customer_portal_summary(),
  public.customer_request(uuid),public.customer_proposals(integer),public.respond_customer_proposal(uuid,text,boolean),public.set_customer_event_confirmation(uuid,uuid,boolean)
  to authenticated;
grant execute on function public.customer_proposal_pdf_source(uuid,uuid) to service_role;

commit;
