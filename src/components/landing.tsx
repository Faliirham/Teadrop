"use client";

import Link from "next/link";
import { Button, idr } from "@/components/ui";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: <RealtimeIcon />,
    title: "Realtime & transparan",
    desc: "Total dana dan status pembayaran terlihat semua anggota tanpa perlu nanya-nanya.",
  },
  {
    icon: <UsersIcon />,
    title: "Kode undangan",
    desc: "Bendahara buat circle, teman gabung cukup lewat kode. Role admin & anggota jelas.",
  },
  {
    icon: <CalendarIcon />,
    title: "Periode bulanan",
    desc: "Buat periode iuran, catat pembayaran cash/transfer/QRIS, pantau siapa belum lunas.",
  },
  {
    icon: <BankIcon />,
    title: "Audit saldo",
    desc: "Update saldo manual dengan jejak riwayat: siapa, kapan, dari berapa ke berapa.",
  },
];

const SAMPLE = [
  { name: "Squad Teh Tarik", amount: 350000 },
  { name: "Reuni Angkatan 2020", amount: 1200000 },
];

export function Landing() {
  return (
    <main id="main" tabIndex={-1} className="min-h-dvh outline-none">
      <div className="mx-auto max-w-5xl px-4">
        {/* header */}
        <nav className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
              <DropLogo />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Teadrop
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login?mode=masuk">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link href="/login?mode=daftar">
              <Button size="sm">Mulai Gratis</Button>
            </Link>
          </div>
        </nav>

        {/* hero */}
        <section className="py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            <DropIcon /> Tabungan bersama circle, tanpa drama
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            Kelola iuran bersama,
            <br />
            <span className="bg-gradient-to-r from-accent to-indigo-400 bg-clip-text text-transparent">
              transparan & realtime
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">
            Buat circle, kumpulkan iuran, dan pantau siapa yang sudah bayar — semuanya
            di satu tempat dan bisa diakses semua anggota. Daftar gratis dalam
            semenit, atau masuk tanpa password pakai magic link. Tanpa
            kredensial? Coba mode demo langsung dari halaman login.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login?mode=daftar">
              <Button size="lg">Buat Circle Gratis</Button>
            </Link>
            <Link href="/login?mode=magic">
              <Button variant="outline" size="lg">Coba Magic Link</Button>
            </Link>
          </div>
        </section>

        {/* feature list */}
        <section className="grid gap-4 py-8 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <SpotlightCard key={f.title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                {f.icon}
              </span>
              <div>
                <h3 className="font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </section>

        {/* sample circles */}
        <section className="pb-8">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">
            Begini tampilannya
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLE.map((c) => (
              <SpotlightCard key={c.name}>
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-foreground">{c.name}</h3>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                    Bendahara
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
                  <p className="text-xs text-muted">Dana terkumpul</p>
                  <p className="mt-1 text-2xl font-extrabold text-accent">
                    {idr(c.amount)}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full w-3/4 rounded-full bg-accent-strong" />
                  </div>
                  <span className="text-xs text-muted">75%</span>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </section>

        {/* auth entry */}
        <section className="pb-20">
          <SpotlightCard className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-lg font-extrabold text-foreground">
              Mulai dari yang paling nyaman
            </h2>
            <p className="max-w-md text-sm text-muted">
              Punya password? Masuk langsung. Baru pertama kali? Daftar 1 menit.
              Malas ingat password? Magic link saja.
            </p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <Link href="/login?mode=masuk">
                <Button variant="outline" size="md">Masuk</Button>
              </Link>
              <Link href="/login?mode=daftar">
                <Button size="md">Daftar Gratis</Button>
              </Link>
              <Link href="/login?mode=magic">
                <Button variant="ghost" size="md">Magic Link</Button>
              </Link>
            </div>
          </SpotlightCard>
        </section>
      </div>
    </main>
  );
}

function DropLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 2.7S5.5 9.4 5.5 14.4a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.7 12 2.7Z" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12 2.7S5.5 9.4 5.5 14.4a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.7 12 2.7Z" />
    </svg>
  );
}

function RealtimeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 21h18M4 21V10M20 21V10M4 10l8-6 8 6M8 21v-7M12 21v-7M16 21v-7" />
    </svg>
  );
}
