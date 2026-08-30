# Roadmap — Teadrop

## Fase 1 — MVP Web ✅ (sedang)
- [ ] Setup Supabase project + migrasi skema + RLS
- [ ] Auth (magic link/password) + profil
- [ ] Buat/join circle via kode undangan
- [ ] Manajemen anggota & role
- [ ] Periode iuran bulanan
- [ ] Catat pembayaran/kontribusi
- [ ] Dashboard realtime (total dana, progres, tenggat)
- [ ] Update saldo manual + audit trail
- [ ] Matriks status bayar + log bulanan
- [ ] Deploy Vercel

## Fase 2 — PWA & Polish ✅ (selesai)
- [x] PWA manifest + service worker (installable di HP) — `app/manifest.ts`, `public/sw.js`
- [x] Pengingat jatuh tempo sisi klien + notifikasi browser (opt-in) — `due-date-reminder.tsx`
- [x] Ekspor CSV — riwayat saldo & pembayaran per periode, via `lib/csv.ts`
- [x] Dark mode — toggle bertema (sistem + localStorage)
- [x] Onboarding & empty states yang ramah — landing page + panduan 3 langkah
- [x] Statistik circle — chart tren pengumpulan & kontribusi per anggota

> Catatan: Web Push penuh (VAPID) memerlukan backend & key; MVP memakai notifikasi browser
> dan banner pengingat di sisi klien sehingga tetap berfungsi di mode demo.

## Fase 3 — Fitur Dokumentasi Circle ✅ (selesai)
- [x] Diary kegiatan: post moment + upload foto — `src/components/diary.tsx`, `src/lib/api.ts`, `src/lib/demo/store.ts`
- [x] Galeri foto per circle — `src/components/gallery.tsx`, lightbox viewer
- [x] Kalender meetup: acara berikutnya, RSVP sederhana — `src/hooks/use-teadrop.ts`, `src/lib/api.ts`
- [x] Statistik kebersamaan (grafik kegiatan per tahun) — statistik sudah ada di tab Statistik, perlu diagram per tahun

## Fase 4 — Native App (Expo)
- [ ] Porting UI ke Expo (React Native) — reuse pola data & logika
- [ ] Notifikasi native
- [ ] Share ke grup WhatsApp (deep link invite)
- [ ] Rilis APK internal circle

## Backlog / Ide
- Anggota tanpa akun (dikelola bendahara)
- Multi-currency
- Split bill acara
- Integrasi QRIS statis untuk pembayaran
