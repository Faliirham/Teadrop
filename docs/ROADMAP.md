# Roadmap — Teadrop

## Fase 1 — MVP Web ✅ (selesai)
- [x] Setup Supabase project + migrasi skema + RLS
- [x] Auth (magic link/password) + profil
- [x] Buat/join circle via kode undangan
- [x] Manajemen anggota & role
- [x] Periode iuran bulanan
- [x] Catat pembayaran/kontribusi
- [x] Dashboard realtime (total dana, progres, tenggat)
- [x] Update saldo manual + audit trail
- [x] Matriks status bayar + log bulanan
- [x] Deploy Vercel

## Fase 2 — PWA & Polish ✅ (selesai)
- [x] PWA manifest + service worker (installable di HP) — `app/manifest.ts`, `public/sw.js`
- [x] Pengingat jatuh tempo sisi klien + notifikasi browser (opt-in) — `due-date-reminder.tsx`
- [x] Ekspor CSV — riwayat saldo & pembayaran per periode, via `lib/csv.ts`
- [x] Dark mode — toggle bertema (sistem + localStorage)
- [x] Onboarding & empty states yang ramah — landing page + panduan 3 langkah
- [x] Statistik circle — chart tren pengumpulan & kontribusi per anggota

> Catatan: Web Push penuh (VAPID) memerlukan backend & key; MVP memakai notifikasi
> browser dan banner pengingat di sisi klien sehingga tetap berfungsi di mode demo.

## Fase 3 — Fitur Dokumentasi Circle ✅ (selesai)
- [x] Diary kegiatan: post moment + upload foto — `src/components/diary.tsx`, `src/lib/api.ts`, `src/lib/demo/store.ts`
- [x] Galeri foto per circle — `src/components/gallery.tsx`, lightbox viewer
- [x] Galeri terhubung ke tab Dokumentasi — flatten semua foto momen jadi grid galeri
- [x] Kalender meetup: acara berikutnya, RSVP sederhana — `src/hooks/use-teadrop.ts`, `src/lib/api.ts`
- [ ] Statistik kebersamaan (grafik aktivitas per tahun) — perlu diagram per tahun

## Fase 4 — Internal Circle MVP ✅ (dikerjakan)
- [x] Google OAuth — login via provider Google (`lib/api.ts:signInWithGoogle`)
- [x] Link lihat read-only tanpa login — read_token per circle + RPC `get_circle_public` (Fase 4 read-only)
- [x] Redesign UI "Ethereal Glass" dark-first — `globals.css`, `theme.tsx`, `ui.tsx`
- [x] ReactBits SpotlightCard (dikopi manual, tanpa gsap/three) — `components/reactbits/SpotlightCard.tsx`
- [x] Perbaikan error TypeScript + build/lint bersih
- [ ] Migrasi SQL `0003_read_links.sql` dijalankan di Supabase (read_token + RPC)
- [ ] Setup OAuth Google di dashboard Supabase (client ID/secret + redirect URL)

## Fase 5 — Native App (Expo)
- [ ] Porting UI ke Expo (React Native) — reuse pola data & logika
- [ ] Notifikasi native
- [ ] Share ke grup WhatsApp (deep link invite)
- [ ] Rilis APK internal circle

## Backlog / Ide
- Anggota tanpa akun (dikelola bendahara)
- Multi-currency
- Split bill acara
- Integrasi QRIS statis untuk pembayaran
