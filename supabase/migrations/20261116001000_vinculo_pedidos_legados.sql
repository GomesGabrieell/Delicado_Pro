begin;

create table private.website_request_claims (
  request_id uuid primary key references public.website_requests(id) on delete cascade,
  token_hash bytea not null unique,
  issuer_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null
);
alter table private.website_request_claims enable row level security;
revoke all on private.website_request_claims from public,anon,authenticated;

create function public.can_issue_customer_claim(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.website_requests r where r.id=p_request and r.customer_id is null
    and private.has_company_access(r.company_id,'website_requests.manage'));
$$;

create function public.issue_customer_request_claim(p_request uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare token text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
begin
  perform 1 from public.website_requests r where id=p_request and customer_id is null
    and private.has_company_access(r.company_id,'website_requests.manage') for update;
  if not found then raise exception 'Solicitação não elegível' using errcode='42501'; end if;
  insert into private.website_request_claims(request_id,token_hash,issuer_id,expires_at)
    values(p_request,sha256(convert_to(token,'UTF8')),auth.uid(),clock_timestamp()+interval '24 hours')
    on conflict (request_id) do update set token_hash=excluded.token_hash,issuer_id=excluded.issuer_id,
      expires_at=excluded.expires_at,redeemed_at=null,redeemed_by=null;
  return token;
end;
$$;

create function public.accept_customer_request_claim(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare digest bytea;
declare claim private.website_request_claims;
declare request public.website_requests;
declare claim_id uuid;
declare verified_email text;
begin
  if not private.is_regular_user() or p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Link indisponível' using errcode='42501';
  end if;
  select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  digest := sha256(convert_to(p_token,'UTF8'));
  select request_id into claim_id from private.website_request_claims where token_hash=digest;
  -- Lock in the same order as issuance so reissuing a link cannot deadlock a claim.
  select * into request from public.website_requests where id=claim_id for update;
  select * into claim from private.website_request_claims where request_id=claim_id and token_hash=digest for update;
  if not found or claim.redeemed_at is not null or claim.expires_at<=clock_timestamp()
    or request.customer_id is not null or lower(request.customer_email) is distinct from verified_email
    or claim.issuer_id=auth.uid()
    or not exists(select 1 from public.company_members m join private.role_permissions p on p.role=m.role
      where m.company_id=request.company_id and m.user_id=claim.issuer_id and m.status='active'
        and p.permission='website_requests.manage') then
    raise exception 'Link indisponível' using errcode='42501';
  end if;
  update public.website_requests set customer_id=auth.uid() where id=claim_id and customer_id is null;
  update private.website_request_claims set redeemed_at=clock_timestamp(),redeemed_by=auth.uid() where request_id=claim_id;
  return claim_id;
end;
$$;
revoke all on function public.can_issue_customer_claim(uuid),public.issue_customer_request_claim(uuid),public.accept_customer_request_claim(text)
  from public,anon,authenticated;
grant execute on function public.can_issue_customer_claim(uuid),public.issue_customer_request_claim(uuid),public.accept_customer_request_claim(text) to authenticated;

commit;
