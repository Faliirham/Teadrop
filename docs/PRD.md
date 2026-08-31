# PRD (Product Requirements Document) — Teadrop

> Aplikasi tabungan bersama & dokumentasi circle pertemanan.
> Versi dokumen: 1.0 · Status: MVP

## 1. Ringkasan Produk

| Aspek | Keterangan |
|---|---|
| Nama | Teadrop |
| Jenis | Web application (rencana evolusi: PWA → native) |
| Target pengguna | Circle/komunitas pertemanan kecil (5–30 orang) yang punya iuran bersama |
| Masalah utama | Pengelolaan iuran bersama tidak transparan: siapa belum bayar tidak jelas, saldo tidak bisa dipantau, riwayat tersebar di chat |
| Solusi | Satu tempat untuk mencatat iuran, memantau dana terkumpul secara live, melihat status pembayaran, dan menyimpan riwayat bulanan |

## 2. Tujuan & Non-Tujuan

### Tujuan MVP
1. Bendahara dapat membuat circle & mengundang anggota via kode undangan.
2. Anggota dapat melihat status pembayarannya sendiri tanpa bertanya.
3. Total dana terkumpul tampil **realtime** (tanpa refresh).
4. Riwayat pembayaran & log per bulan tersimpan rapi dan dapat ditinjau ulang.
5. Saldo dana di rekening/RDPU dapat di-update **manual** oleh bendahara dengan jejak audit (saldo lama → baru).

### Non-tujuan MVP
- Sinkronisasi otomatis dengan bank/API eksternal (keputusan final: input manual).
- Pembayaran online / payment gateway.
- Multi-currency.
- Read-only link tidak pernah membocorkan `invite_code` atau data edit (hanya snapshot keuangan).

## 3. Persona

### Persona A — Bendahara (admin)
- Membuat circle, menentukan nominal iuran & periode.
- Mencatat pembayaran tunang/transfer anggota (bisa mewakili anggota lain).
- Update saldo RDPU/rekening secara manual setelah setor/cair.

### Persona B — Anggota (member)
- Bergabung via kode undangan.
- Cek status: sudah/belum bayar periode ini, total dana circle, riwayat kontribusinya sendiri.

## 4. User Stories (MVP)

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-01 | admin | membuat circle + kode undangan | teman bisa bergabung mudah |
| US-02 | anggota | join lewat kode undangan | tidak perlu proses rumit |
| US-03 | bendahara | membuat periode iuran bulanan dengan nominal | target kolektif jelas |
| US-04 | bendahara | mencatat pembayaran atas nama anggota mana pun | pembayaran tunai tetap tercatat |
| US-05 | anggota | melihat status bayar/belum saya | tahu kapan harus setor |
| US-06 | semua anggota | melihat total terkumpul realtime | transparansi penuh |
| US-07 | bendahara | update saldo manual + catatan | saldo app = saldo asli |
| US-08 | semua anggota | melihat riwayat saldo & pembayaran per bulan | akuntabilitas |
| US-09 | admin | menutup periode | data bulan lampiran tidak berubah |

## 5. Fitur MVP

### F1 — Autentikasi & Profil
- Login: email magic-link, email+password, atau **Google OAuth** (via Supabase Auth).
- Profil: nama tampilan, avatar opsional.

### F2 — Manajemen Circle
- Buat circle: nama, deskripsi, nominal iuran default per bulan.
- Kode undangan unik (misal `TEA-X7K2P9`), dapat di-regenerate admin.
- Role: `admin` (bendahara) dan `member`. Admin bisa promote/demote.
- Keluar circle (member), hapus circle (admin).

### F3 — Periode Iuran
- Periode bulanan: nama (mis. "Agustus 2026"), tanggal mulai, jatuh tempo, nominal per anggota.
- Status: aktif / ditutup. Periode tertutup bersifat read-only.

### F4 — Kontribusi/Pembayaran
- Catat pembayaran: anggota, jumlah, tanggal bayar, metode (cash/transfer/QRIS), catatan.
- Bendahara dapat mencatat untuk anggota lain; anggota bisa menandai miliknya sendiri sebagai "sudah transfer" (menunggu konfirmasi) — *opsional, fase lanjutan*.
- Validasi: pembayaran hanya pada periode aktif.

### F5 — Dashboard Realtime
- Kartu ringkasan: total dana terkumpul (iuran masuk ± saldo manual), progres periode aktif (X/Y anggota lunas), tenggat terdekat.
- Update otomatis via Supabase Realtime tanpa refresh.

### F6 — Status & Log Bulanan
- Matriks anggota × bulan: hijau (lunas), kuning (sebagian), merah (belum).
- Halaman riwayat: daftar transaksi per bulan + ringkasan.
- Riwayat perubahan saldo (audit trail): siapa, kapan, dari berapa ke berapa, catatan.

### F7 — Link Lihat (Read-only, Fase 4 / Internal Circle)
- Setiap circle punya `read_token` unik (uuid) yang di-generate otomatis saat dibuat.
- Admin dapat "menyalin link lihat" dan "memutar ulang (rotasi) link".
- Siapa pun dengan link bisa membuka halaman `c/[token]` tanpa login dan melihat snapshot:
  nama, deskripsi, saldo terbaru, periode aktif + total terkumpul, dan daftar anggota.
- RPC `get_circle_public` (security-definer) TIDAK pernah mengembalikan `invite_code`,
  data kontribusi detail, ataupun data yang bisa diedit.
- RPC `rotate_read_token` khusus admin untuk mencabut akses link lama.

### F8 — Redesign UI "Ethereal Glass" (Dark-first)
- Skema warna default **gelap** (OLED `#050505`) dengan aksen emerald tunggal; mode terang opt-in.
- Glassmorphism pada kartu/container mengambang, nebula ambient + film grain di latar.
- Primitif UI (`ui.tsx`) & ikon SVG menggantikan emoji dan class `slate`/`dark:` lama.

## 6. Metrik Keberhasilan (MVP)
1. Waktu bendahara menjawab "sudah bayar belum?" turun dari chat back-and-forth menjadi < 10 detik (anggota cek mandiri).
2. Latensi update realtime < 2 detik sejak pencatatan.
3. 100% perubahan saldo punya jejak audit.
4. Dipakai minimal 1 siklus iuran penuh (1 bulan) oleh circle nyata.

## 7. Risiko & Mitigasi
| Risiko | Mitigasi |
|---|---|
| Anggota malas daftar akun | Onboarding sesimpel mungkin; magic link |
| Salah input saldo manual | Audit trail + wajib isi catatan perubahan |
| Kode undangan bocor | Admin bisa regenerate; join selalu butuh persetujuan? (MVP: auto-join, evaluasi nanti) |

## 8. Rilis Berikutnya

### Fase 3 — Fitur Dokumentasi Circle (selesai)
- **Diary kegiatan**: poster moment dengan foto (implementasi di `src/components/diary.tsx`, API di `src/lib/api.ts`, seed di `src/lib/demo/store.ts`)
- **Galeri foto**: grid gallery dengan lightbox viewer (`src/components/gallery.tsx`), kini terhubung ke tab Dokumentasi sebagai satu grid foto seluruh momen
- **Kalender meetup**: daftar acara dengan RSVP (`src/lib/api.ts:createMeetup/rsvpMeetup`, `use-teadrop.ts`)
- **Statistik kebersamaan**: grafik aktivitas per anggota & per periode (terbuka: diagram per tahun)

### Fase 4 — Internal Circle MVP (selesai)
- **Google OAuth**: tombol "Masuk dengan Google" di halaman login (`lib/api.ts:signInWithGoogle`)
- **Link lihat read-only**: `read_token` per circle, halaman publik `c/[token]`, RPC `get_circle_public` + `rotate_read_token` (migrasi `supabase/migrations/0003_read_links.sql`)
- **Redesign UI "Ethereal Glass"**: dark-first, token warna, ReactBits SpotlightCard (dikopi manual, tanpa gsap/three)

### Fase 5 — Native App (Expo)
- Porting UI ke Expo (React Native) — reuse pola data & logika
- Notifikasi native
- Share ke grup WhatsApp (deep link invite)
- Rilis APK internal circle
