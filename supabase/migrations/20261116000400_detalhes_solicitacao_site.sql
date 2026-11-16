begin;

alter table public.website_requests add column contact_details jsonb;
grant select (contact_details) on public.website_requests to authenticated;

create function public.submit_website_catalog_request_v2(
  p_portal text, p_request_key uuid, p_name text, p_event text, p_services text[],
  p_date date, p_city text, p_details text, p_items jsonb, p_contact jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  submitted_id uuid;
begin
  if not private.website_customer_confirmed() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_contact) is distinct from 'object' then
    raise exception 'Dados adicionais inválidos' using errcode = '23514';
  end if;
  if exists (select 1 from jsonb_object_keys(p_contact) as k(name)
       where k.name not in ('venue','guests','whatsapp','inspiration','notes'))
     or exists (select 1 from jsonb_each(p_contact) as j(key,value)
       where j.key <> 'guests' and jsonb_typeof(j.value) <> 'string')
     or char_length(p_contact->>'venue') > 150
     or char_length(p_contact->>'inspiration') > 2000
     or char_length(p_contact->>'notes') > 700
     or coalesce(p_contact->>'whatsapp','') !~ '^([0-9]{10,15})?$'
     or (p_contact->>'guests' is not null and (jsonb_typeof(p_contact->'guests') <> 'number'
       or p_contact->>'guests' !~ '^([1-9][0-9]{0,4}|100000)$')) then
    raise exception 'Dados adicionais inválidos' using errcode = '23514';
  end if;

  submitted_id := public.submit_website_catalog_request(p_portal, p_request_key, p_name,
    p_event, p_services, p_date, p_city, p_details, p_items);
  update public.website_requests set contact_details = p_contact
    where id = submitted_id and customer_id = auth.uid() and contact_details is null;
  return submitted_id;
end;
$$;

revoke all on function public.submit_website_catalog_request_v2(text,uuid,text,text,text[],date,text,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_website_catalog_request_v2(text,uuid,text,text,text[],date,text,text,jsonb,jsonb)
  to authenticated;

commit;
