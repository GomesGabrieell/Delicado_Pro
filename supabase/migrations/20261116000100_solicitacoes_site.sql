begin;

-- Configure the receiving company in the database, outside the public form.
create table private.website_portals (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  company_id uuid not null references public.companies(id) on delete cascade
);
alter table private.website_portals enable row level security;
revoke all on private.website_portals from public, anon, authenticated;

insert into private.role_permissions (role, permission) values ('owner', 'website_requests.manage');

create table public.website_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  request_key uuid not null,
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  customer_email text not null check (char_length(customer_email) between 1 and 254),
  event_type text not null check (event_type in ('casamento', 'aniversario', 'cha', 'corporativo', 'outro')),
  services text[] not null check (
    cardinality(services) between 1 and 5 and
    services <@ array['cenario', 'baloes', 'flores', 'mesas', 'completa']::text[]
  ),
  event_date date,
  city text not null check (char_length(btrim(city)) between 1 and 120),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'closed')),
  created_at timestamptz not null default now(),
  unique (company_id, customer_id, request_key)
);
create index website_requests_company_date_idx on public.website_requests (company_id, created_at desc, id desc);
alter table public.website_requests enable row level security;
revoke all on public.website_requests from public, anon, authenticated;
grant select (id, company_id, customer_name, customer_email, event_type, services, event_date, city, details, status, created_at)
  on public.website_requests to authenticated;
create policy website_requests_owner_read on public.website_requests for select to authenticated
  using (private.has_company_access(company_id, 'website_requests.manage'));

create function public.submit_website_request(
  p_portal text, p_request_key uuid, p_name text, p_event text, p_services text[],
  p_date date, p_city text, p_details text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  destination uuid;
  requester uuid := auth.uid();
  verified_email text;
  submitted_id uuid;
begin
  if not private.is_regular_user() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select email into verified_email from auth.users where id = requester and email_confirmed_at is not null;
  if verified_email is null then
    raise exception 'Confirme seu e-mail antes de enviar' using errcode = '42501';
  end if;

  select company_id into destination from private.website_portals where slug = p_portal;
  if destination is null then
    raise exception 'Portal indisponível' using errcode = 'P0002';
  end if;

  insert into public.website_requests (
    company_id, customer_id, request_key, customer_name, customer_email, event_type, services, event_date, city, details
  ) values (
    destination, requester, p_request_key, btrim(p_name), verified_email, p_event, p_services,
    p_date, btrim(p_city), coalesce(btrim(p_details), '')
  ) on conflict (company_id, customer_id, request_key) do nothing
  returning id into submitted_id;

  if submitted_id is null then
    select id into submitted_id from public.website_requests
      where company_id = destination and customer_id = requester and request_key = p_request_key;
  end if;
  return submitted_id;
end;
$$;

create function public.manage_website_request(p_company uuid, p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_company_access(p_company, 'website_requests.manage') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  update public.website_requests
    set status = p_status
    where company_id = p_company and id = p_id
      and (status = p_status or (status = 'new' and p_status = 'reviewing') or (status = 'reviewing' and p_status = 'closed'));
  if not found then
    raise exception 'Solicitação ou mudança de status indisponível' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.submit_website_request(text,uuid,text,text,text[],date,text,text),
  public.manage_website_request(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.submit_website_request(text,uuid,text,text,text[],date,text,text),
  public.manage_website_request(uuid,uuid,text) to authenticated;

commit;
