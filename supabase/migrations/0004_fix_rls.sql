-- ============================================================
-- Teadrop — Security hardening (Fase 4 audit fix)
-- 1. invite_code dibuat server-side (trigger), bukan kiriman client.
-- 2. read_token disembunyikan dari anon/authenticated; dibaca via RPC
--    admin-only (get_read_token) — mirip get_circle_public.
-- 3. Storage circle-photos: hanya MEMBER circle yang bisa upload ke
--    folder milik circle-nya; admin circle bisa hapus file di folder-nya.
-- 4. contrib update admin: tambah WITH CHECK agar tak bisa mengubah
--    member/period keluar dari circle yang sama & periode terbuka.
-- Jalankan setelah 0003_read_links.sql
-- ============================================================

-- ---------- 1. INVITE CODE SERVER-SIDE ----------
-- Generator kode undangan (aman, tanpa karakter mudah salah baca).
create or replace function public.make_invite_code(length int default 8)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..length loop
    out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return out;
end;
$$;

-- Ubah trigger circle jadi BEFORE INSERT agar bisa mengisi invite_code.
drop trigger if exists on_circle_created on public.circles;
drop function if exists public.handle_new_circle();

create or replace function public.handle_new_circle()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- invite_code selalu dibuat server-side; input client diabaikan.
  new.invite_code := public.make_invite_code();
  return new;
end;
$$;

create trigger on_circle_created
before insert on public.circles
for each row execute procedure public.handle_new_circle();

-- Trigger AFTER yang menambahkan admin sebagai member pertama.
create or replace function public.handle_new_circle_member()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.circle_members (circle_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_circle_created_member
after insert on public.circles
for each row execute procedure public.handle_new_circle_member();

-- ---------- 2. READ_TOKEN HANYA VIA RPC ADMIN ----------
-- Sembunyikan kolom read_token dari akses langsung anon/authenticated.
-- Column-level security: klien tetap bisa select kolom lain.
revoke select (read_token) on table public.circles from anon, authenticated;

-- RPC baca read_token khusus admin (security definer melewati RLS).
drop function if exists public.get_read_token(uuid);

create or replace function public.get_read_token(p_circle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if not public.is_circle_admin(p_circle_id) then
    raise exception 'FORBIDDEN';
  end if;

  select read_token into v_token
  from public.circles
  where id = p_circle_id and deleted_at is null;

  if v_token is null then
    raise exception 'NO_READ_TOKEN';
  end if;

  return v_token;
end;
$$;

revoke all on function public.get_read_token(uuid) from public;
grant execute on function public.get_read_token(uuid) to authenticated;

-- ---------- 3. STORAGE: hanya member circle ----------
-- Hapus policy lama yang mengizinkan SEMUA authenticated meng-upload.
drop policy if exists "photos_bucket_authenticated_insert" on storage.objects;

-- Insert hanya bila folder pertama (circle_id) milik circle yang
-- user adalah anggotanya. Struktur upload: {circleId}/{momentId}/...
-- storage.foldername(name) => folder[]; index [1] = segmen pertama.
-- Nilai non-uuid akan menjadi NULL (dan is_circle_member(NULL)=false),
-- sehingga path invalid ditolak RLS tanpa memicu cast error.
create policy "photos_bucket_member_insert" on storage.objects
  for insert with check (
    bucket_id = 'circle-photos'
    and auth.role() = 'authenticated'
    and public.is_circle_member(
      nullif((storage.foldername(name))[1], '')::uuid
    )
  );

-- Delete: pemilik gambar ATAU admin circle yang memuat folder gambar.
drop policy if exists "photos_bucket_owner_delete" on storage.objects;

create policy "photos_bucket_owner_or_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'circle-photos'
    and (
      owner = auth.uid()
      or (
        (storage.foldername(name))[1] is not null
        and public.is_circle_admin(
          nullif((storage.foldername(name))[1], '')::uuid
        )
      )
    )
  );

-- ---------- 4. CONTRIB UPDATE: WITH CHECK ----------
-- Ganti policy update kontribusi agar perubahan tidak bisa memindahkan
-- kontribusi ke periode tertutup / circle lain / member circle lain.
drop policy if exists "contrib_update_admin_open" on public.contributions;

create policy "contrib_update_admin_open" on public.contributions
  for update using (
    exists (
      select 1 from public.periods p
      where p.id = period_id and p.is_closed = false
        and public.is_circle_admin(p.circle_id)
    )
  )
  with check (
    recorded_by = auth.uid()
    and exists (
      select 1
      from public.periods p
      join public.circle_members m on m.id = contributions.member_id
      where p.id = period_id
        and p.is_closed = false
        and p.circle_id = m.circle_id
        and public.is_circle_admin(p.circle_id)
    )
  );
