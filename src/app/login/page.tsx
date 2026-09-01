"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { Button, Input } from "@/components/ui";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { ThemeToggle } from "@/components/theme-toggle";
import { signIn, sendMagicLink, signInWithGoogle } from "@/lib/api";
import { isDemoMode } from "@/lib/env";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"none" | "password" | "magic" | "google">("none");
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("password");
    try {
      await signIn(email, password);
      await qc.invalidateQueries({ queryKey: ["session"] });
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
      await sendMagicLink(email, window.location.origin, next);
      if (isDemoMode) {
        await qc.invalidateQueries({ queryKey: ["session"] });
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

  const handleGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle(window.location.origin, next);
      if (isDemoMode) {
        await qc.invalidateQueries({ queryKey: ["session"] });
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk dengan Google");
    } finally {
      setBusy("none");
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <DropLogo />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
            Teadrop
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tabungan bersama circle — transparan & realtime
          </p>
        </div>

        <SpotlightCard className="p-6">
          {isDemoMode && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-300">
              <b>MODE DEMO</b> — data tersimpan di browser ini saja. Masuk dengan
              email apa pun (mis. <code>kamu@demo.id</code>) untuk mencoba dengan
              data contoh.
            </div>
          )}

          {magicSent && (
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
              Magic link terkirim! Cek inbox email kamu.
            </div>
          )}

          <div className="space-y-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleGoogle}
              loading={busy === "google"}
            >
              <GoogleMark /> Masuk dengan Google
            </Button>

            <Divider label="atau pakai email" />

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
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" loading={busy === "password"}>
                Masuk
              </Button>
            </form>

            <Divider label="atau" />

            <Button
              variant="outline"
              size="lg"
              onClick={handleMagic}
              loading={busy === "magic"}
            >
              <MailIcon /> Masuk via Magic Link
            </Button>

            <p className="pt-1 text-center text-xs text-muted">
              Belum punya akun? Cukup masuk — akun dibuat otomatis.
            </p>
          </div>
        </SpotlightCard>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="transition hover:text-foreground">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </main>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted/60">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function DropLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
      <path d="M12 2.7S5.5 9.4 5.5 14.4a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.7 12 2.7Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
