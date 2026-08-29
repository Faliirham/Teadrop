"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, idr } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: "🔴",
    title: "Realtime & transparan",
    desc: "Total dana dan status pembayaran terlihat semua anggota tanpa perlu nanya-nanya.",
  },
  {
    icon: "👥",
    title: "Kode undangan",
    desc: "Bendahara buat circle, teman gabung cukup lewat kode. Role admin & anggota jelas.",
  },
  {
    icon: "📅",
    title: "Periode bulanan",
    desc: "Buat periode iuran, catat pembayaran cash/transfer/QRIS, pantau siapa belum lunas.",
  },
  {
    icon: "🏦",
    title: "Audit saldo",
    desc: "Update saldo manual dengan jejak riwayat: siapa, kapan, dari berapa ke berapa.",
  },
];

const SAMPLE = [
  { name: "Squad Teh Tarik 🧋", amount: 350000 },
  { name: "Reuni Angkatan 2020 🎓", amount: 1200000 },
];

export function Landing({ onDemoStart }: { onDemoStart: () => void }) {
  const [demoBusy, setDemoBusy] = useState(false);

  const startDemo = async () => {
    setDemoBusy(true);
    await onDemoStart();
  };

  return (
    <main className="min-h-dvh bg-gradient-to-b from-emerald-50 via-white to-emerald-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="mx-auto max-w-5xl px-4">
        {/* header */}
        <nav className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍃</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Teadrop
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Mulai Gratis</Button>
            </Link>
          </div>
        </nav>

        {/* hero */}
        <section className="py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            💧 Tabungan bersama circle, tanpa drama
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            Kelola iuran bersama,
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              transparan & realtime
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 dark:text-slate-400">
            Buat circle, kumpulkan iuran, dan pantau siapa yang sudah bayar —
            semuanya di satu tempat dan bisa diakses semua anggota.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg">Buat Circle Gratis</Button>
            </Link>
            <Button variant="outline" size="lg" onClick={startDemo} loading={demoBusy}>
              🚀 Coba Demo
            </Button>
          </div>
        </section>

        {/* feature list */}
        <section className="grid gap-4 py-8 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
            >
              <span className="text-2xl">{f.icon}</span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* sample circles */}
        <section className="pb-20">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            Begini tampilannya
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLE.map((c) => (
              <div
                key={c.name}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{c.name}</h3>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Bendahara
                  </span>
                </div>
                <div className="mt-4 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white">
                  <p className="text-xs text-emerald-100">Dana terkumpul</p>
                  <p className="mt-1 text-2xl font-extrabold">{idr(c.amount)}</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className="h-full w-3/4 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs text-slate-400">75%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
