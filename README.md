# Teadrop

**Tabungan bersama & dokumentasi circle pertemanan — transparan, realtime, tanpa drama chat.**

Teadrop membantu circle pertemanan mengelola iuran bersama: siapa yang belum bayar, berapa dana yang sudah terkumpul (live), dan riwayat lengkap per bulan — termasuk pencatatan manual saldo dana yang disimpan di rekening/RDPU dengan jejak audit.

> Roadmap: Web (MVP) → PWA → Aplikasi Native (Expo)

## Fitur MVP

- Auth (email/password, magic link, Google OAuth)
- Buat & gabung circle via **kode undangan** (8-char)
- Periode iuran bulanan + nominal per anggota
- Catat pembayaran (cash/transfer/QRIS) — bendahara bisa catat untuk semua
- **Dashboard realtime** — total dana terkumpul update tanpa refresh
- Matriks status bayar/belum per anggota × bulan
- Log pembayaran & riwayat bulanan
- Update saldo rekening/RDPU **manual** dengan audit trail (saldo lama → baru)
- Diary & momen berfoto (kompresi client-side, max 4 foto/post)
- Galeri foto dengan lightbox
- Kalender meetup & RSVP
- Statistik kontribusi (grafik SVG)
- Export CSV pembayaran & audit saldo
- Halaman publik `/c/[token]` — tampilan read-only tanpa login
- PWA (installable, offline app shell)
- Dark/light theme (OLED-first, glassmorphism)
- Demo mode — full功能 tanpa backend (localStorage)

## Tech Stack

| Layer         | Technology                                       |
| ------------- | ------------------------------------------------ |
| Frontend      | Next.js 16 · React 19 · TypeScript · Tailwind v4 |
| Backend       | Supabase (Postgres + Auth + **Realtime** + Storage) |
| Data fetching | TanStack Query v5                                |
| Hosting       | Vercel                                           |

## Menjalankan Proyek

```bash
# 1. Clone
git clone https://github.com/Faliirham/Teadrop.git
cd Teadrop

# 2. Install dependencies
npm install

# 3. Siapkan environment
cp .env.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY
# atau kosongkan untuk demo mode (localStorage)

# 4. Jalankan migrasi database
# Lihat docs/ARCHITECTURE.md untuk setup Supabase

# 5. Start dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Akun Test (Demo Mode)

| Field    | Value              |
| -------- | ------------------ |
| Email    | `kamu@demo.id`     |
| Password | `Teadrop-demo-2026!` |

## Dokumentasi

| Document                                   | Content                                    |
| ------------------------------------------ | ------------------------------------------ |
| [docs/PRD.md](docs/PRD.md)                 | Visi produk, persona, user stories, metrik |
| [docs/SRS.md](docs/SRS.md)                 | Requirement fungsional & non-fungsional    |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, ERD, flow, struktur folder  |
| [docs/ROADMAP.md](docs/ROADMAP.md)         | Fase pengembangan MVP → native             |

## Lisensi

MIT © [FaliIrham](https://github.com/FaliIrham)
