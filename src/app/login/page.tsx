"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button, Card, Input } from "@/components/ui";
import { signIn, sendMagicLink } from "@/lib/api";
import { isDemoMode } from "@/lib/env";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"none" | "password" | "magic">("none");
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("password");
    try {
      await signIn(email, password);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setBusy("none");
    }
  };

  const handleMagic = async () => {
    if (!email.trim()) {
      setError("Isi email dulu ya.");
      return;
    }
    setError(null);
    setBusy("magic");
    try {
      await sendMagicLink(email, window.location.origin);
      if (isDemoMode) {
        router.replace(next);
        router.refresh();
        return;
      }
      setMagicSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim magic link");
    } finally {
      setBusy("none");
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">🍃</div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            Teadrop
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tabungan bersama circle — transparan & realtime
          </p>
        </div>

        <Card className="space-y-4">
          {isDemoMode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              <b>MODE DEMO</b> — data tersimpan di browser ini saja.
              Masuk dengan email apa pun (mis. <code>kamu@demo.id</code>) untuk
              mencoba dengan data contoh.
            </div>
          )}

          {magicSent && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✉️ Magic link terkirim! Cek inbox email kamu.
            </div>
          )}

          <form onSubmit={handlePassword} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              hint={isDemoMode ? "Di mode demo password diabaikan" : undefined}
            />
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" loading={busy === "password"}>
              Masuk
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="h-px flex-1 bg-slate-200" />
            atau
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <Button variant="outline" size="lg" onClick={handleMagic} loading={busy === "magic"}>
            ✉️ Masuk via Magic Link
          </Button>

          <p className="pt-1 text-center text-xs text-slate-400">
            Belum punya akun? Cukup masuk — akun dibuat otomatis.
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </main>
  );
}
