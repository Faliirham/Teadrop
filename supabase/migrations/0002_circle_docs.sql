-- ============================================================
-- Teadrop — Circle Documentation (Fase 3)
-- Diary momen + foto, kalender meetup, RSVP sederhana
-- Jalankan setelah 0001_init.sql
-- ============================================================

-- ---------- MOMENTS (diary kegiatan) ----------
create table public.moments (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ---------- MOMENT PHOTOS ----------
create table public.moment_photos (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments (id) on delete cascade,
  url text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

-- ---------- MEETUPS (kalender acara) ----------
create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text,
  location text,
  start_at timestamptz not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- MEETUP RSVPS ----------
create table public.meetup_rsvps (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetups (id) on delete cascade,
  member_id uuid not null references public.circle_members (id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'maybe', 'declined')),
  created_at timestamptz not null default now(),
  unique (meetup_id, member_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_moments_circle on public.moments (circle_id, created_at desc);
create index idx_moment_photos_moment on public.moment_photos (moment_id);
create index idx_meetups_circle on public.meetups (circle_id, start_at asc);
create index idx_rsvps_meetup on public.meetup_rsvps (meetup_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.moments enable row level security;
alter table public.moment_photos enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_rsvps enable row level security;

-- moments
create policy "moments_select_member" on public.moments
  for select using (public.is_circle_member(circle_id));
create policy "moments_insert_member" on public.moments
  for insert with check (author_id = auth.uid() and public.is_circle_member(circle_id));
create policy "moments_delete_author_or_admin" on public.moments
  for delete using (
    author_id = auth.uid() or public.is_circle_admin(circle_id)
  );

-- moment_photos
create policy "photos_select_member" on public.moment_photos
  for select using (
    exists (
      select 1 from public.moments m
      where m.id = moment_id and public.is_circle_member(m.circle_id)
    )
  );
create policy "photos_insert_member" on public.moment_photos
  for insert with check (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.author_id = auth.uid()
        and public.is_circle_member(m.circle_id)
    )
  );

-- meetups
create policy "meetups_select_member" on public.meetups
  for select using (public.is_circle_member(circle_id));
create policy "meetups_insert_member" on public.meetups
  for insert with check (created_by = auth.uid() and public.is_circle_member(circle_id));
create policy "meetups_update_creator_or_admin" on public.meetups
  for update using (created_by = auth.uid() or public.is_circle_admin(circle_id));
create policy "meetups_delete_creator_or_admin" on public.meetups
  for delete using (created_by = auth.uid() or public.is_circle_admin(circle_id));

-- meetup_rsvps
create policy "rsvps_select_member" on public.meetup_rsvps
  for select using (
    exists (
      select 1 from public.meetups m
      where m.id = meetup_id and public.is_circle_member(m.circle_id)
    )
  );
create policy "rsvps_upsert_own" on public.meetup_rsvps
  for insert with check (
    exists (
      select 1
      from public.meetups m
      join public.circle_members cm on cm.circle_id = m.circle_id and cm.user_id = auth.uid()
      where m.id = meetup_id and cm.id = member_id
    )
  );
create policy "rsvps_update_own" on public.meetup_rsvps
  for update using (
    exists (
      select 1
      from public.meetups m
      join public.circle_members cm on cm.circle_id = m.circle_id and cm.user_id = auth.uid()
      where m.id = meetup_id and cm.id = member_id
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.moments;
alter publication supabase_realtime add table public.moment_photos;
alter publication supabase_realtime add table public.meetups;
alter publication supabase_realtime add table public.meetup_rsvps;

-- ============================================================
-- STORAGE: bucket foto circle (public read, member write)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('circle-photos', 'circle-photos', true)
on conflict (id) do nothing;

create policy "photos_bucket_public_read" on storage.objects
  for select using (bucket_id = 'circle-photos');

create policy "photos_bucket_authenticated_insert" on storage.objects
  for insert with check (
    bucket_id = 'circle-photos' and auth.role() = 'authenticated'
  );

create policy "photos_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'circle-photos' and owner = auth.uid()
  );
