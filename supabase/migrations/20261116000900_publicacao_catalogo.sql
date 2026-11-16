begin;

alter table public.catalog_items add column website_visible boolean not null default true;
grant select (website_visible) on public.catalog_items to authenticated;

create function public.set_catalog_website_visibility(p_company uuid,p_item uuid,p_visible boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_company_access(p_company,'catalog.write') then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  update public.catalog_items set website_visible=p_visible where id=p_item and company_id=p_company;
  if not found then raise exception 'Item indisponível' using errcode='P0002'; end if;
end;
$$;
revoke all on function public.set_catalog_website_visibility(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_catalog_website_visibility(uuid,uuid,boolean) to authenticated;


create or replace function public.list_website_catalog(p_portal text, p_kind text, p_query text, p_offset integer)
returns table (
  id uuid, kind text, name text, category text, brand text, size text,
  balloon_type text, unit text, photo_path text
)
language plpgsql stable security definer set search_path = '' as $$
declare destination uuid;
begin
  if not private.website_customer_confirmed() then
    raise exception 'Confirme seu e-mail para consultar o catálogo' using errcode = '42501';
  end if;
  select company_id into destination from private.website_portals where slug = p_portal;
  if destination is null then
    raise exception 'Catálogo indisponível' using errcode = 'P0002';
  end if;
  return query
    select item.id, item.kind, item.name, category.name, item.brand, item.size, item.balloon_type,
      item.unit, item.photo_path
    from public.catalog_items item
    left join public.catalog_categories category on category.id = item.category_id
      and category.company_id = item.company_id and category.kind = item.kind
    where item.company_id = destination and item.archived_at is null and item.website_visible
      and (coalesce(p_kind, '') = '' or item.kind = p_kind)
      and (strpos(lower(item.search_text), lower(left(btrim(coalesce(p_query, '')), 80))) > 0
        or strpos(lower(category.name), lower(left(btrim(coalesce(p_query, '')), 80))) > 0)
    order by item.name, item.id
    offset greatest(p_offset, 0) limit 25;
end;
$$;

create or replace function private.website_catalog_photo_visible(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.website_customer_confirmed() and exists (
    select 1 from private.website_portals portal
    join public.catalog_items item on item.company_id = portal.company_id
    where item.company_id = private.catalog_photo_company(p_path)
      and item.photo_path = p_path and item.archived_at is null and item.website_visible
  );
$$;

create or replace function public.submit_website_catalog_request(
  p_portal text, p_request_key uuid, p_name text, p_event text, p_services text[],
  p_date date, p_city text, p_details text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  destination uuid;
  submitted_id uuid;
  snapshot jsonb;
  unique_count integer;
begin
  if not private.website_customer_confirmed() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  select company_id into destination from private.website_portals where slug = p_portal;
  if destination is null then
    raise exception 'Portal indisponível' using errcode = 'P0002';
  end if;

  select id into submitted_id from public.website_requests
    where company_id = destination and customer_id = auth.uid()
      and request_key = p_request_key and catalog_items is not null;
  if submitted_id is not null then return submitted_id; end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Seleção inválida' using errcode = '23514';
  end if;
  if jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Escolha entre 1 e 50 itens' using errcode = '23514';
  end if;

  select jsonb_agg(jsonb_build_object(
      'id', item.id, 'name', item.name, 'unit', item.unit, 'quantity', choice.quantity
    ) order by picked.ordinality), count(distinct item.id)
  into snapshot, unique_count
  from jsonb_array_elements(p_items) with ordinality picked(value, ordinality)
  cross join lateral jsonb_to_record(picked.value) choice(id uuid, quantity numeric)
  join public.catalog_items item on item.id = choice.id and item.company_id = destination and item.archived_at is null and item.website_visible
  where choice.quantity > 0 and choice.quantity < 1000000000
    and choice.quantity = trunc(choice.quantity, case when item.kind = 'material' then 3 else 0 end);

  if unique_count <> jsonb_array_length(p_items) then
    raise exception 'Seleção indisponível ou quantidade inválida' using errcode = '23514';
  end if;

  submitted_id := public.submit_website_request(
    p_portal, p_request_key, p_name, p_event, p_services, p_date, p_city, p_details
  );
  update public.website_requests set catalog_items = snapshot
    where id = submitted_id and company_id = destination and customer_id = auth.uid() and catalog_items is null;
  if not exists (
    select 1 from public.website_requests where id = submitted_id and company_id = destination and catalog_items is not null
  ) then
    raise exception 'Portal indisponível' using errcode = 'P0002';
  end if;
  return submitted_id;
end;
$$;

commit;
