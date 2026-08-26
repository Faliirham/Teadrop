-- ============================================================
-- Teadrop — Initial Schema (MVP)
-- Jalankan di Supabase SQL Editor atau via Supabase CLI
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- auto-create profile saat user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------- CIRCLES ----------
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text,
  invite_code text not null unique check (char_length(invite_code) between 6 and 12),
  default_amount numeric(14, 2) not null default 0 check (default_amount >= 0),
  created_by uuid not null references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- pembuat circle otomatis jadi admin member
create or replace function public.handle_new_circle()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.circle_members (circle_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_circle_created
after insert on public.circles
for each row execute procedure public.handle_new_circle();

-- ---------- CIRCLE MEMBERS ----------
create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (circle_id, user_id)
);

-- ---------- PERIODS ----------
create table public.periods (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  start_date date not null,
  due_date date not null,
  amount_per_member numeric(14, 2) not null check (amount_per_member >= 0),
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (circle_id, name),
  check (due_date >= start_date)
);

-- ---------- CONTRIBUTIONS ----------
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods (id) on delete cascade,
  member_id uuid not null references public.circle_members (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  method text not null default 'transfer' check (method in ('cash', 'transfer', 'qris', 'other')),
  note text,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- BALANCE UPDATES (immutable audit trail) ----------
create table public.balance_updates (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  previous_amount numeric(14, 2) not null default 0,
  new_amount numeric(14, 2) not null check (new_amount >= 0),
  note text not null check (char_length(note) > 0),
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_circles_invite_code on public.circles (invite_code);
create index idx_members_user on public.circle_members (user_id);
create index idx_members_circle on public.circle_members (circle_id);
create index idx_periods_circle on public.periods (circle_id);
create index idx_contrib_period on public.contributions (period_id);
create index idx_contrib_member on public.contributions (member_id);
create index idx_balance_circle on public.balance_updates (circle_id, created_at desc);

-- ============================================================
-- HELPER FUNCTIONS (untuk policy RLS)
-- ============================================================
create or replace function public.is_circle_member(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.circle_members cm
    join public.circles c on c.id = cm.circle_id
    where cm.circle_id = cid
      and cm.user_id = auth.uid()
      and c.deleted_at is null
  );
$$;

create or replace function public.is_circle_admin(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.circle_members cm
    join public.circles c on c.id = cm.circle_id
    where cm.circle_id = cid
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
      and c.deleted_at is null
  );
$$;

-- ============================================================
-- RPC: JOIN CIRCLE VIA KODE UNDANGAN
-- ============================================================
create or replace function public.join_circle(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_circle uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select id into v_circle
  from public.circles
  where invite_code = upper(btrim(p_code)) and deleted_at is null;

  if v_circle is null then
    raise exception 'KODE_TIDAK_VALID';
  end if;

  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle, auth.uid(), 'member')
  on conflict (circle_id, user_id) do nothing;

  return v_circle;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.periods enable row level security;
alter table public.contributions enable row level security;
alter table public.balance_updates enable row level security;

-- profiles: lihat & edit data sendiri; anggota circle boleh lihat profil sesama anggota
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_select_fellow" on public.profiles
  for select using (
    exists (
      select 1 from public.circle_members a
      join public.circle_members b
        on a.circle_id = b.circle_id
      where a.user_id = auth.uid() and b.user_id = profiles.id
    )
  );
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- circles
create policy "circles_select_member" on public.circles
  for select using (public.is_circle_member(id));
create policy "circles_insert_creator" on public.circles
  for insert with check (created_by = auth.uid());
create policy "circles_update_admin" on public.circles
  for update using (public.is_circle_admin(id));

-- circle_members
create policy "members_select_visible" on public.circle_members
  for select using (public.is_circle_member(circle_id));
create policy "members_leave_own" on public.circle_members
  for delete using (user_id = auth.uid() and role = 'member');
create policy "members_manage_admin" on public.circle_members
  for update using (public.is_circle_admin(circle_id));
create policy "members_remove_admin" on public.circle_members
  for delete using (public.is_circle_admin(circle_id) and role = 'member');
-- insert hanya lewat trigger handle_new_circle / rpc join_circle (security definer)

-- periods
create policy "periods_select_member" on public.periods
  for select using (public.is_circle_member(circle_id));
create policy "periods_write_admin" on public.periods
  for insert with check (public.is_circle_admin(circle_id));
create policy "periods_update_admin_open" on public.periods
  for update using (public.is_circle_admin(circle_id) and is_closed = false);
-- menutup periode tetap bisa walau sudah closed? tidak — closed berarti read-only permanen

-- contributions
create policy "contrib_select_member" on public.contributions
  for select using (
    exists (
      select 1 from public.periods p where p.id = period_id and public.is_circle_member(p.circle_id)
    )
  );
create policy "contrib_insert_member_or_admin" on public.contributions
  for insert with check (
    recorded_by = auth.uid()
    and exists (
      select 1
      from public.periods p
      join public.circle_members m on m.id = contributions.member_id
      where p.id = period_id
        and p.is_closed = false
        and public.is_circle_member(p.circle_id)
        and (m.user_id = auth.uid() or public.is_circle_admin(p.circle_id))
    )
  );
create policy "contrib_update_admin_open" on public.contributions
  for update using (
    exists (
      select 1 from public.periods p
      where p.id = period_id and p.is_closed = false and public.is_circle_admin(p.circle_id)
    )
  );
create policy "contrib_delete_admin_open" on public.contributions
  for delete using (
    exists (
      select 1 from public.periods p
      where p.id = period_id and p.is_closed = false and public.is_circle_admin(p.circle_id)
    )
  );

-- balance_updates: immutable
create policy "balance_select_member" on public.balance_updates
  for select using (public.is_circle_member(circle_id));
create policy "balance_insert_admin" on public.balance_updates
  for insert with check (recorded_by = auth.uid() and public.is_circle_admin(circle_id));

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.contributions;
alter publication supabase_realtime add table public.balance_updates;
alter publication supabase_realtime add table public.periods;
alter publication supabase_realtime add table public.circle_members;
