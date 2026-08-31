-- ============================================================
-- Teadrop — Shareable read-only circle links (Fase 4)
-- Setiap circle punya read_token acak. Siapa pun dengan token
-- bisa MEMBACA snapshot circle tanpa login, via RPC security
-- definer yang TIDAK membocorkan invite_code maupun data edit.
-- ============================================================

-- ---------- KOLOM READ TOKEN ----------
alter table public.circles
  add column read_token uuid unique default gen_random_uuid();

-- index untuk lookup token cepat
create index idx_circles_read_token on public.circles (read_token);

-- ============================================================
-- RPC: BACA DATA PUBLIK (READ-ONLY) VIA TOKEN
-- security definer: melewati RLS, TAPI divalidasi token + deleted_at.
-- Hanya mengembalikan field baca-aman. Invite_code TIDAK dikembalikan.
-- ============================================================
drop function if exists public.get_circle_public(uuid);

create or replace function public.get_circle_public(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_circle public.circles%rowtype;
  v_result jsonb;
begin
  if p_token is null then
    return null;
  end if;

  -- lookup circle by read token (harus belum dihapus)
  select * into v_circle
  from public.circles c
  where c.read_token = p_token
    and c.deleted_at is null;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id',            v_circle.id,
    'name',          v_circle.name,
    'description',   v_circle.description,
    'default_amount', v_circle.default_amount,
    'created_at',    v_circle.created_at,
    -- saldo terbaru
    'latest_balance', (
      select jsonb_build_object('new_amount', b.new_amount, 'created_at', b.created_at)
      from public.balance_updates b
      where b.circle_id = v_circle.id
      order by b.created_at desc
      limit 1
    ),
    -- anggota (nama saja + role, tanpa profil penuh)
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', m.id,
               'role', m.role,
               'full_name', p.full_name
             ) order by m.joined_at asc), '[]'::jsonb)
      from public.circle_members m
      left join public.profiles p on p.id = m.user_id
      where m.circle_id = v_circle.id
    ),
    -- periode aktif + total terkumpul
    'active_period', (
      select jsonb_build_object(
               'id', p.id,
               'name', p.name,
               'due_date', p.due_date,
               'amount_per_member', p.amount_per_member,
               'collected', (
                 select coalesce(sum(c.amount), 0)
                 from public.contributions c
                 where c.period_id = p.id
               )
             )
      from public.periods p
      where p.circle_id = v_circle.id and p.is_closed = false
      order by p.created_at desc
      limit 1
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_circle_public(uuid) from public;
grant execute on function public.get_circle_public(uuid) to anon, authenticated;

-- ============================================================
-- RPC: GANTI (ROTATE) READ TOKEN — KHUSUS ADMIN
-- ============================================================
drop function if exists public.rotate_read_token(uuid);

create or replace function public.rotate_read_token(p_circle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  -- hanya admin circle yang boleh
  if not public.is_circle_admin(p_circle_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_token := gen_random_uuid();
  update public.circles
  set read_token = v_token
  where id = p_circle_id and deleted_at is null;

  return v_token;
end;
$$;

revoke all on function public.rotate_read_token(uuid) from public;
grant execute on function public.rotate_read_token(uuid) to authenticated;
