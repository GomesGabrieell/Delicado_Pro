begin;

create or replace function public.create_company(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_regular_user() or not exists (
    select 1 from public.company_members where user_id = auth.uid() and role = 'owner' and status = 'active'
  ) then
    raise exception 'O primeiro vínculo de proprietário requer provisionamento autorizado' using errcode = '42501';
  end if;
  insert into public.companies(name) values (btrim(p_name)) returning id into new_id;
  insert into public.company_members(company_id,user_id,role,status) values(new_id,auth.uid(),'owner','active');
  return new_id;
end;
$$;

create table private.company_invitations (
  token_hash bytea primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','member')),
  issuer_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  redeemed_at timestamptz
);
alter table private.company_invitations enable row level security;
revoke all on private.company_invitations from public,anon,authenticated;

create function public.issue_company_invitation(p_company uuid,p_email text,p_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare token text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
declare email text := lower(btrim(p_email));
begin
  if not private.has_company_access(p_company,'members.manage')
    or (p_role = 'admin' and not private.has_company_access(p_company,'members.manage_privileged')) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('admin','member') or email is null
    or char_length(email) > 254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Convite inválido' using errcode = '23514';
  end if;
  insert into private.company_invitations(token_hash,company_id,email,role,issuer_id,expires_at)
    values(sha256(convert_to(token,'UTF8')),p_company,email,p_role,auth.uid(),clock_timestamp()+interval '7 days');
  return token;
end;
$$;

create function public.accept_company_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation private.company_invitations;
declare verified_email text;
begin
  if not private.is_regular_user() or p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Convite indisponível' using errcode = '42501';
  end if;
  select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select * into invitation from private.company_invitations
    where token_hash=sha256(convert_to(p_token,'UTF8')) for update;
  if not found or verified_email is distinct from invitation.email or invitation.redeemed_at is not null
    or invitation.expires_at <= clock_timestamp() or auth.uid() = invitation.issuer_id then
    raise exception 'Convite indisponível' using errcode = '42501';
  end if;
  perform 1 from public.companies where id=invitation.company_id for update;
  if not exists (
    select 1 from public.company_members m join private.role_permissions p on p.role=m.role
    where m.company_id=invitation.company_id and m.user_id=invitation.issuer_id and m.status='active'
      and p.permission=case invitation.role when 'admin' then 'members.manage_privileged' else 'members.manage' end
  ) then
    raise exception 'Convite indisponível' using errcode = '42501';
  end if;
  insert into public.company_members(company_id,user_id,role,status)
    values(invitation.company_id,auth.uid(),invitation.role,'active')
    on conflict (company_id,user_id) do nothing;
  if not exists (select 1 from public.company_members where company_id=invitation.company_id
      and user_id=auth.uid() and status='active') then
    raise exception 'Vínculo anterior deve ser revisado pela empresa' using errcode = '42501';
  end if;
  update private.company_invitations set redeemed_at=clock_timestamp() where token_hash=invitation.token_hash;
  return invitation.company_id;
end;
$$;

create function public.list_company_team(p_company uuid,p_offset integer default 0)
returns table(user_id uuid,role text,status text,display_name text,email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_company_access(p_company,'members.list') then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  return query select m.user_id,m.role,m.status,p.display_name,u.email
    from public.company_members m join auth.users u on u.id=m.user_id
    left join public.profiles p on p.user_id=m.user_id
    where m.company_id=p_company
    order by m.status,coalesce(p.display_name,u.email,''),m.user_id
    offset greatest(p_offset,0) limit 21;
end;
$$;

revoke all on function public.issue_company_invitation(uuid,text,text), public.accept_company_invitation(text), public.list_company_team(uuid,integer)
  from public,anon,authenticated;
grant execute on function public.issue_company_invitation(uuid,text,text), public.accept_company_invitation(text), public.list_company_team(uuid,integer)
  to authenticated;

commit;
