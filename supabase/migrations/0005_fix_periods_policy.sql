-- ============================================================
-- Teadrop — Fix RLS: close period
-- `periods_update_admin_open` hanya punya USING (tanpa WITH CHECK).
-- Untuk UPDATE Postgres memakai ekspresi USING sebagai CHECK baris baru,
-- sehingga menutup periode (is_closed false -> true) DITOLAK karena
-- baris baru tidak lagi memenuhi `is_closed = false`.
-- Solusi: tambahkan WITH CHECK yang hanya mengizinkan admin.
-- Pembukaan kembali (closed -> open) tetap dicegah oleh USING
-- karena baris yang sudah closed tidak menjadi target update.
-- ============================================================

drop policy if exists "periods_update_admin_open" on public.periods;

create policy "periods_update_admin_open" on public.periods
  for update using (
    public.is_circle_admin(circle_id) and is_closed = false
  )
  with check (
    public.is_circle_admin(circle_id)
  );
