# 🍃 Teadrop

**Tabungan bersama & dokumentasi circle pertemanan — transparan, realtime, tanpa drama chat.**

Teadrop membantu circle pertemanan mengelola iuran bersama: siapa yang belum bayar, berapa dana yang sudah terkumpul (live), dan riwayat lengkap per bulan — termasuk pencatatan manual saldo dana yang disimpan di rekening/RDPU dengan jejak audit.

> 📱 Roadmap: Web (MVP) → PWA → Aplikasi Native (Expo)

## ✨ Fitur MVP

- 🔐 Auth sederhana (email magic link / password)
- 👥 Buat & gabung circle via **kode undangan**
- 💰 Periode iuran bulanan + nominal per anggota
- ✅ Catat pembayaran (cash/transfer/QRIS) — bendahara bisa catat untuk semua
- 📊 **Dashboard realtime** — total dana terkumpul update tanpa refresh
- 📋 Matriks status bayar/belum per anggota × bulan
- 🧾 Log pembayaran & riwayat bulanan
- 🏦 Update saldo rekening/RDPU **manual** dengan audit trail (saldo lama → baru)

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui |
| Backend | Supabase (Postgres + Auth + **Realtime**) |
| Data fetching | TanStack Query |
| Hosting | Vercel |

## 🚀 Menjalankan Proyek

```bash
# 1. Clone
git clone https://github.com/Faliirham/Teadrop.git
cd Teadrop

# 2. Install dependencies
npm install

# 3. Siapkan environment
cp .env.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Jalankan migrasi database (lihat docs/ARCHITECTURE.md)

# 5. Start dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## 📁 Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Visi produk, persona, user stories, metrik |
| [docs/SRS.md](docs/SRS.md) | Requirement fungsional & non-fungsional |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, ERD, flow, struktur folder |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Fase pengembangan MVP → native |

## 📄 Lisensi

MIT © [FaliIrham](https://github.com/FaliIrham)
