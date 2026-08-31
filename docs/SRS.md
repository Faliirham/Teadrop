# SRS (Software Requirements Specification) — Teadrop

Versi: 1.0 · Merujuk pada [PRD.md](./PRD.md)

## 1. Batasan Sistem
- Web app responsive (mobile-first), dijalankan di browser modern.
- Backend: Supabase (Postgres + Auth + Realtime + Storage).
- Hosting: Vercel (frontend) + Supabase cloud (database).
- Bahasa: TypeScript end-to-end.

## 2. Functional Requirements

### FR-1 Autentikasi
- FR-1.1 Pengguna dapat mendaftar & login menggunakan email (magic link atau password) atau Google OAuth.
- FR-1.2 Session dikelola oleh Supabase Auth; refresh token otomatis.
- FR-1.3 Profil dibuat otomatis (trigger) setelah signup: `profiles` terhubung ke `auth.users`.
- FR-1.4 Logout menghapus session lokal dan server-side.

### FR-2 Circle
- FR-2.1 Authenticated user dapat membuat circle (nama wajib, deskripsi opsional, nominal iuran default).
- FR-2.2 Pembuat circle otomatis menjadi `admin`.
- FR-2.3 Sistem menghasilkan kode undangan unik 8 karakter; admin dapat regenerate.
- FR-2.4 User dapat join circle dengan memasukkan kode undangan.
- FR-2.5 Satu user boleh join banyak circle; satu circle punya banyak anggota.
- FR-2.6 Admin dapat mengubah role member ↔ admin.
- FR-2.7 Member dapat keluar circle; admin tidak dapat keluar sebelum transfer admin / hapus circle.
- FR-2.8 Admin dapat menghapus circle (soft delete: `deleted_at`).

### FR-3 Periode Iuran
- FR-3.1 Admin membuat periode: nama, tanggal mulai, jatuh tempo, nominal per anggota.
- FR-3.2 Hanya satu periode aktif per circle pada waktu bersamaan.
- FR-3.3 Admin menutup periode → read-only permanen.
- FR-3.4 Periode lampau tetap dapat dilihat (riwayat).

### FR-4 Kontribusi
- FR-4.1 Pembayaran dicatat dengan: anggota target, jumlah, tanggal bayar, metode (`cash|transfer|qris|lainnya`), catatan opsional.
- FR-4.2 Admin dapat mencatat pembayaran untuk semua anggota — via aksi per-anggota **"Catat"** (member ter-preset, tanpa dropdown pemilih); member hanya melihat status dirinya sendiri.
- FR-4.3 Edit/hapus kontribusi hanya oleh admin, dan hanya pada periode aktif.
- FR-4.4 Status lunas anggota = total kontribusinya ≥ nominal periode.
- FR-4.5 Kontribusi melebihi nominal dihitung sebagai kelebihan (tidak error).

### FR-5 Saldo Manual (Rekening/RDPU)
- FR-5.1 Admin dapat mencatat update saldo: nilai baru (sistem hitung delta dari nilai terakhir), catatan wajib.
- FR-5.2 Setiap update tersimpan immutable (audit trail): saldo_lama, saldo_baru, oleh siapa, kapan.
- FR-5.3 Saldo terkini = entri audit terakhir.
- FR-5.4 Total dana ditampilkan = saldo rekening terkini (sumber utama), dengan rincian iuran terkumpul sebagai informasi pendukung.

### FR-6 Dashboard Realtime
- FR-6.1 Perubahan pada `contributions`, `balance_updates`, `periods`, `circle_members` tercermin di UI < 2 detik tanpa refresh (Supabase Realtime).
- FR-6.2 Kartu ringkasan: total dana, progres periode aktif, tenggat terdekat, jumlah anggota.

### FR-7 Laporan & Riwayat
- FR-7.1 Matriks status anggota × periode (lunas/sebagian/belum).
- FR-7.2 Log transaksi per bulan dengan filter periode.
- FR-7.3 Ekspor CSV riwayat pembayaran (per periode) dan audit trail saldo — diimplementasikan (`lib/csv.ts`).

### FR-8 Link Lihat (Read-only)
- FR-8.1 Setiap circle memiliki `read_token uuid` unik, di-generate otomatis (`gen_random_uuid()`).
- FR-8.2 Admin dapat mengambil read_token (untuk "salin link") dan memanggil `rotate_read_token` untuk menggantinya.
- FR-8.3 Siapa pun (termasuk anon, tanpa auth) dengan `read_token` valid dapat memanggil `get_circle_public` dan melihat snapshot keuangan read-only.
- FR-8.4 `get_circle_public` hanya mengembalikan field aman (nama, deskripsi, saldo terakhir, periode aktif, nama+role anggota); TIDAK mengembalikan `invite_code`, `read_token`, kontribusi detail, ataupun data edit.
- FR-8.5 Halaman `c/[token]` menampilkan snapshot; CTA mengarahkan login untuk mengelola.

### FR-9 UI "Ethereal Glass" (Dark-first)
- FR-9.1 Tema default gelap (base), mode terang opt-in lewat class `.light`.
- FR-9.2 Seluruh halaman memakai token warna (`background/surface/foreground/muted/border/accent`), bukan class `slate`/`dark:`.
- FR-9.3 Ikon SVG menggantikan emoji pada UI.

## 3. Non-Functional Requirements

| ID | Kategori | Requirement |
|---|---|---|
| NFR-1 | Keamanan | Row Level Security (RLS) aktif di semua tabel; akses berbasis membership circle |
| NFR-2 | Keamanan | Service key tidak pernah diekspos ke client; hanya anon key |
| NFR-3 | Performa | LCP < 2.5s pada koneksi 4G; interaksi dashboard < 100ms setelah data siap |
| NFR-4 | Responsivitas | Mobile-first, layar 360px–1440px |
| NFR-5 | Reliabilitas | Realtime reconnect otomatis saat koneksi putus |
| NFR-6 | Auditability | Semua mutasi saldo immutable |
| NFR-7 | i18n | Bahasa antarmuka: Indonesia; format mata uang IDR |
| NFR-8 | Aksesibilitas | Kontras WCAG AA pada komponen inti |

## 4. Batasan & Asumsi
- Semua anggota circle memiliki akun (MVP tidak mendukung "anggota manual" tanpa akun).
- Dana tersimpan di rekening/RDPU yang dicatat manual — aplikasi bukan sistem pembayaran.
- Tidak ada integrasi API eksternal (keputusan: API NAB reksa dana publik dinilai tidak resmi/rentang berubah).
- Link lihat read-only bersifat publik oleh desain; admin harus melakukan rotate jika link bocor.
