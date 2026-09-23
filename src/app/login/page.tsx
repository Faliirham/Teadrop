"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { AuthBanner, AuthTabs, Button, FieldError, Input, PasswordInput, type AuthTabId } from "@/components/ui";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";
import { signIn, signUp, sendMagicLink, signInWithGoogle, validateEmail, validatePassword, normalizeEmail } from "@/lib/api";
import { isDemoMode } from "@/lib/env";

function initialTab(mode: string | null): AuthTabId {
  return mode === "daftar" || mode === "magic" || mode === "masuk"
    ? mode
    : "masuk";
}

/** Path internal yang aman untuk redirect balik setelah login. */
function sanitizeNextClient(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (/[\r\n]/.test(value)) return "/";
  const path = value.split("?")[0];
  if (path === "/login" || path.startsWith("/auth/")) return "/";
  return value;
}

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
  const toast = useToast();
  const params = useSearchParams();
  const next = sanitizeNextClient(params.get("next"));
  const callbackError = params.get("error");
  const callbackReason = params.get("reason");
  const modeParam = params.get("mode");

  const [tab, setTab] = useState<AuthTabId>(() => initialTab(modeParam));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState<"none" | "password" | "magic" | "google">("none");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const authBusy = busy !== "none";

  const friendlyAuthError = (err: unknown, fallback: string) => {
    const raw = err instanceof Error ? err.message : fallback;
    if (
      /failed to fetch|fetch failed|network|ERR_NAME_NOT_RESOLVED|ENOTFOUND|load failed/i.test(
        raw
      )
    ) {
      return "Tidak bisa menghubungi Supabase. Cek koneksi internet dan NEXT_PUBLIC_SUPABASE_URL di .env.local, lalu restart dev server.";
    }
    if (/EMAIL_CONFIRM_REQUIRED/.test(raw)) {
      return "Akun dibuat! Cek inbox email untuk konfirmasi, lalu masuk lagi. (Atau pakai tab Magic Link — langsung jalan tanpa konfirmasi.)";
    }
    if (/email not confirmed/i.test(raw)) {
      return "Email belum dikonfirmasi. Cek inbox kamu, atau masuk via tab Magic Link.";
    }
    if (/invalid login credentials/i.test(raw)) {
      return tab === "daftar"
        ? "Email ini sudah terdaftar. Pindah ke tab Masuk, atau cek lagi password kamu."
        : "Email/password salah. Cek lagi penulisan email dan password kamu.";
    }
    if (/password.*(short|6 characters)|weak password/i.test(raw)) {
      return "Password minimal 6 karakter ya.";
    }
    if (/Passwords do not match|konfirmasi/i.test(raw)) {
      return raw;
    }
    return raw;
  };

  const switchTab = (t: AuthTabId) => {
    if (authBusy) return;
    setTab(t);
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
    setMagicSent(false);
  };

  const waitForSession = async (tries = 12) => {
    const { getSessionUser } = await import("@/lib/api");
    for (let i = 0; i < tries; i++) {
      const s = await getSessionUser().catch(() => null);
      if (s) return s;
      // Tunggu cookie @supabase/ssr ditulis sebelum redirect, agar
      // homepage tidak sempat membaca sesi null (flicker ke Landing).
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  };

  const finishPasswordAuth = async () => {
    await qc.invalidateQueries({ queryKey: ["session"] });
    await waitForSession();
    await qc.invalidateQueries({ queryKey: ["session"] });
    router.replace(next);
    router.refresh();
  };

  const handleMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy !== "none") return;
    const eErr = validateEmail(email);
    const pErr = isDemoMode ? null : validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    setError(null);
    setBusy("password");
    try {
      await signIn(normalizeEmail(email), password);
      toast.success("Berhasil masuk. Mengalihkan…");
      await finishPasswordAuth();
    } catch (err) {
      setError(friendlyAuthError(err, "Gagal masuk"));
    } finally {
      setBusy("none");
    }
  };

  const handleDaftar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy !== "none") return;
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr =
      password !== confirmPassword ? "Konfirmasi password belum sama. Cek lagi ya." : null;
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);
    if (eErr || pErr || cErr) return;
    setError(null);
    setBusy("password");
    try {
      await signUp(normalizeEmail(email), password);
      toast.success("Akun dibuat. Mengalihkan…");
      await finishPasswordAuth();
    } catch (err) {
      setError(friendlyAuthError(err, "Gagal mendaftar"));
    } finally {
      setBusy("none");
    }
  };

  const handleMagic = async () => {
    if (busy !== "none") return;
    const eErr = validateEmail(email);
    setEmailError(eErr);
    if (eErr) return;
    setError(null);
    setBusy("magic");
    try {
      await sendMagicLink(normalizeEmail(email), window.location.origin, next);
      if (isDemoMode) {
        await qc.invalidateQueries({ queryKey: ["session"] });
        router.replace(next);
        router.refresh();
        return;
      }
      setMagicSent(true);
      toast.success("Magic link terkirim. Cek inbox ya.");
    } catch (err) {
      setError(friendlyAuthError(err, "Gagal kirim magic link"));
    } finally {
      setBusy("none");
    }
  };

  const handleGoogle = async () => {
    if (busy !== "none") return;
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
      setError(friendlyAuthError(err, "Gagal masuk dengan Google"));
    } finally {
      setBusy("none");
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
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
          {callbackError && (
            <AuthBanner tone="error">
              Sesi dari email/Google gagal diverifikasi
              {callbackReason === "missing_code" ? " (link tidak lengkap). " : " (kemungkinan link kedaluwarsa atau URL redirect belum cocok). "}
              Coba masuk lagi ya
              {next !== "/" ? (
                <>
                  {" "}— setelah berhasil kamu akan diarahkan ke <code>{next}</code>.
                </>
              ) : (
                "."
              )}
            </AuthBanner>
          )}
          {next !== "/" && !callbackError && (
            <AuthBanner tone="info">
              Setelah masuk kamu akan diarahkan ke <code>{next}</code>.
            </AuthBanner>
          )}

          {isDemoMode ? (
            <AuthBanner tone="warning">
              <b>MODE DEMO</b> — data tersimpan di browser ini saja, password
              diabaikan. Masuk dengan email apa pun (mis.{" "}
              <code>kamu@demo.id</code>) untuk mencoba data contoh. Isi kredensial
              Supabase untuk mode live.
            </AuthBanner>
          ) : (
            <AuthBanner tone="info">
              <b>MODE LIVE</b> — akun tersimpan di Supabase. Tab Daftar butuh
              password min. 6 karakter; kalau email mewajibkan konfirmasi, cek
              inbox lalu Masuk lagi (atau pakai Magic Link).
            </AuthBanner>
          )}

          {magicSent && tab === "magic" && (
            <AuthBanner tone="success">
              Magic link terkirim! Cek inbox email kamu, link berlaku terbatas.
              Belum masuk? Tunggu 1 menit lalu kirim ulang.
            </AuthBanner>
          )}

          <AuthTabs tab={tab} onChange={switchTab} disabled={authBusy} />

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

            {tab === "masuk" && (
              <form onSubmit={handleMasuk} className="space-y-4" aria-busy={authBusy}>
                <Input
                  label="Email"
                  type="email"
                  required
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  autoComplete="email"
                  disabled={authBusy}
                  error={emailError}
                />
                <PasswordInput
                  label="Password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  autoComplete="current-password"
                  hint={isDemoMode ? "Di mode demo password diabaikan" : undefined}
                  disabled={authBusy}
                  error={passwordError}
                />
                <FieldError message={error} />
                <Button type="submit" size="lg" loading={busy === "password"}>
                  Masuk
                </Button>
                <p className="text-center text-xs text-muted">
                  Lupa password? Pindah ke tab Magic Link — tanpa password.
                </p>
              </form>
            )}

            {tab === "daftar" && (
              <form onSubmit={handleDaftar} className="space-y-4" aria-busy={authBusy}>
                <Input
                  label="Email"
                  type="email"
                  required
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  autoComplete="email"
                  disabled={authBusy}
                  error={emailError}
                />
                <PasswordInput
                  label="Password (min. 6 karakter)"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  autoComplete="new-password"
                  disabled={authBusy}
                  error={passwordError}
                />
                <PasswordInput
                  label="Konfirmasi password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError(null);
                  }}
                  autoComplete="new-password"
                  disabled={authBusy}
                  error={confirmError}
                />
                <FieldError message={error} />
                <Button type="submit" size="lg" loading={busy === "password"}>
                  Buat Akun
                </Button>
                <p className="text-center text-xs text-muted">
                  Sudah punya akun? Pindah ke tab Masuk.
                </p>
              </form>
            )}

            {tab === "magic" && (
              <div className="space-y-4" aria-busy={authBusy}>
                <Input
                  label="Email"
                  type="email"
                  required
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  autoComplete="email"
                  disabled={authBusy}
                  error={emailError}
                />
                <FieldError message={error} />
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleMagic}
                  loading={busy === "magic"}
                >
                  <MailIcon /> {magicSent ? "Kirim Ulang Magic Link" : "Masuk via Magic Link"}
                </Button>
                <p className="text-center text-xs text-muted">
                  Kami kirim link sekali pakai ke email. Klik link itu untuk
                  masuk — tanpa password, tanpa konfirmasi tambahan.
                </p>
              </div>
            )}
          </div>
        </SpotlightCard>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="transition hover:text-foreground">
            Kembali ke beranda
          </Link>
          {" · "}
          {tab !== "daftar" && (
            <button
              type="button"
              onClick={() => switchTab("daftar")}
              className="transition hover:text-foreground"
            >
              Belum punya akun? Daftar
            </button>
          )}
          {tab === "daftar" && (
            <button
              type="button"
              onClick={() => switchTab("masuk")}
              className="transition hover:text-foreground"
            >
              Sudah punya akun? Masuk
            </button>
          )}
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
