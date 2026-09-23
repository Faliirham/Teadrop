"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { Badge, Button, Card, EmptyState, Input, Modal, Skeleton, idr } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileEditModal } from "@/components/profile-edit";
import { useToast } from "@/components/toast";
import { Landing } from "@/components/landing";
import { useDemoSync, useMyCircles, useSession } from "@/hooks/use-teadrop";
import * as api from "@/lib/api";
import { isDemoMode } from "@/lib/env";

const ACTIVE_KEY = "teadrop:activeCircle";

export default function HomePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: user, isLoading: sessionLoading, isError: sessionError, refetch: refetchSession } = useSession();
  useDemoSync();

  const sessionReady = !sessionLoading && !sessionError;
  const { data: circles, isLoading: circlesLoading } = useMyCircles(
    (sessionReady && !!user) || isDemoMode
  );

  const showLanding = !sessionLoading && !sessionError && !user && !isDemoMode;

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACTIVE_KEY);
  });

  const active = circles?.find((c) => c.id === activeId) ?? circles?.[0] ?? null;

  const pickCircle = (id: string) => {
    setActiveId(id);
    try {
      window.localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      /* ignore */
    }
    setMenuOpen(false);
  };

  // Modals + dropdown open state
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const [cName, setCName] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cAmount, setCAmount] = useState("25000");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    setCreateErr(null);
    setCreating(true);
    try {
      const id = await api.createCircle({
        name: cName,
        description: cDesc,
        defaultAmount: Number(cAmount) || 0,
      });
      setShowCreate(false);
      setCName("");
      setCDesc("");
      toast.success("Circle berhasil dibuat");
      await qc.invalidateQueries({ queryKey: ["circles"] });
      router.push(`/circles/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat circle");
      setCreateErr(e instanceof Error ? e.message : "Gagal membuat circle");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    setJoinErr(null);
    setJoining(true);
    try {
      const id = await api.joinCircle(joinCode);
      setShowJoin(false);
      setJoinCode("");
      toast.success("Berhasil gabung ke circle!");
      await qc.invalidateQueries({ queryKey: ["circles"] });
      router.push(`/circles/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal gabung");
      setJoinErr(e instanceof Error ? e.message : "Gagal gabung");
    } finally {
      setJoining(false);
    }
  };

  const handleLogout = async () => {
    await api.signOut();
    toast.warning("Kamu keluar. Sampai jumpa lagi!");
    await qc.invalidateQueries();
    router.replace("/login?mode=masuk");
    router.refresh();
  };

  const handleProfileSave = async (fullName: string, avatarFile?: File | null) => {
    await api.updateProfile({ fullName, avatarFile });
    await qc.invalidateQueries({ queryKey: ["session"] });
    toast.success("Profil diperbarui");
  };

  if (sessionLoading) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
      </main>
    );
  }

  if (showLanding) {
    return <Landing />;
  }

  if (sessionError && !isDemoMode) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-4xl place-items-center px-4">
        <Card className="w-full max-w-sm text-center">
          <p className="font-bold text-foreground">Sesi tidak bisa dimuat</p>
          <p className="mt-1 text-sm text-muted">
            Koneksi ke layanan login bermasalah. Cek internet kamu lalu coba lagi.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetchSession()}
              className="flex-1"
            >
              Coba Lagi
            </Button>
            <Button onClick={() => router.replace("/login?next=/")} className="flex-1">
              Masuk Ulang
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-16">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
              <DropIcon />
            </span>
            Teadrop
          </h1>

          <div className="flex items-center gap-2">
            {!!circles && circles.length > 0 && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-1.5 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:bg-surface-2"
                >
                  <span className="max-w-[140px] truncate">{active?.name ?? "Pilih circle"}</span>
                  <ChevronIcon className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface/95 p-1.5 shadow-xl backdrop-blur-xl">
                    <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Circlomu
                    </p>
                    {circles.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCircle(c.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-surface-2 ${
                          c.id === active?.id ? "bg-accent-soft text-foreground" : "text-foreground"
                        }`}
                      >
                        <span className="truncate font-medium">{c.name}</span>
                        {c.id === active?.id && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                      </button>
                    ))}
                    <div className="mt-1 border-t border-border pt-1.5">
                      <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-accent transition hover:bg-surface-2"
                      >
                        <PlusIcon /> Buat Circle
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowJoin(true)}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-accent transition hover:bg-surface-2"
                      >
                        <JoinIcon /> Gabung via Kode
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-1.5 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:bg-surface-2"
              title="Edit profil"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                {(user?.name ?? "U").trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline max-w-[100px] truncate">{user?.name}</span>
            </button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
        {isDemoMode && (
          <div className="border-t border-border bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-300">
            <b>MODE DEMO</b> — data contoh di browser ini, password login
            diabaikan. Isi <code>.env.local</code> dengan key Supabase untuk mode
            live (tab Daftar + Magic Link + Google).
          </div>
        )}
        {!isDemoMode && !!user && (
          <div className="border-t border-border bg-accent-soft px-4 py-2 text-center text-xs text-accent">
            <b>MODE LIVE</b> — masuk sebagai {user.email}. Kelola circlemu di bawah.
          </div>
        )}
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6">
        {circlesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : !circles || circles.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={<DropIconBig />}
              title="Belum ada circle"
              desc="Buat circle baru untuk mulai nabung bareng, atau gabung lewat kode undangan dari temanmu."
            />
            <Card>
              <p className="mb-3 text-sm font-bold text-foreground">Mulai dalam 3 langkah</p>
              <ol className="space-y-2.5">
                {[
                  ["Buat circle", "beri nama, deskripsi, dan nominal iuran."],
                  ["Bagikan kode", "undang teman lewat kode undangan."],
                  ["Catat iuran", "buat periode bulanan dan pantau statusnya."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-strong text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">{t}</span>{" "}
                      <span className="text-muted">{d}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreate(true)}>
                <PlusIcon /> Buat Circle
              </Button>
              <Button variant="outline" onClick={() => setShowJoin(true)}>
                Gabung via Kode
              </Button>
            </div>
            {!user && !isDemoMode && (
              <p className="text-center text-xs text-muted">
                Kamu melihat mode pratinjau.{" "}
                <button
                  type="button"
                  onClick={() => router.replace("/login?mode=masuk&next=/")}
                  className="font-semibold text-accent hover:underline"
                >
                  Masuk untuk menyimpan
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Circle aktif */}
            <Card className="group relative overflow-hidden">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-xl font-extrabold leading-snug text-foreground">
                      {active?.name ?? "Pilih circle di atas"}
                    </h2>
                    {active && (
                      <Badge tone={active.role === "admin" ? "indigo" : "slate"}>
                        {active.role === "admin" ? "Bendahara" : "Anggota"}
                      </Badge>
                    )}
                  </div>
                  {active?.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{active.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon /> {active?.memberCount ?? 0} anggota
                    </span>
                    <span>Iuran {idr(active?.default_amount ?? 0)}/bln</span>
                  </div>
                </div>
                {active && (
                  <Link
                    href={`/circles/${active.id}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4f46e5] active:scale-[0.98]"
                  >
                    Kelola Circle <ArrowIcon />
                  </Link>
                )}
              </div>
            </Card>

            {/* Semua circle */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-muted">
                  Semua circle ({circles.length})
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="text-sm font-semibold text-accent transition hover:underline"
                >
                  + Buat baru
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {circles.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCircle(c.id)}
                    className={`group flex items-center justify-between gap-2 rounded-2xl border p-4 text-left transition ${
                      c.id === active?.id
                        ? "border-accent/40 bg-surface-2"
                        : "border-border bg-surface/60 hover:border-accent/30 hover:bg-surface-2"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold leading-snug text-foreground">{c.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {c.memberCount} anggota · {idr(c.default_amount)}/bln
                      </p>
                    </div>
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                        c.id === active?.id
                          ? "bg-accent-soft text-accent"
                          : "bg-surface-2 text-muted group-hover:text-accent"
                      }`}
                    >
                      <CheckIcon />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal buat circle */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat Circle Baru">
        <div className="space-y-4">
          <Input
            label="Nama circle"
            placeholder="mis. Squad Jumat Berkah"
            value={cName}
            onChange={(e) => setCName(e.target.value)}
            maxLength={60}
            autoFocus
          />
          <Input
            label="Deskripsi (opsional)"
            placeholder="Untuk apa iuran ini?"
            value={cDesc}
            onChange={(e) => setCDesc(e.target.value)}
            maxLength={120}
          />
          <Input
            label="Iuran default per bulan (Rp)"
            type="number"
            min={0}
            value={cAmount}
            onChange={(e) => setCAmount(e.target.value)}
          />
          {createErr && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {createErr}
            </p>
          )}
          <Button
            size="lg"
            loading={creating}
            disabled={!cName.trim()}
            onClick={handleCreate}
          >
            Buat Circle
          </Button>
          <p className="text-center text-xs text-muted">
            Kamu otomatis jadi bendahara circle ini.
          </p>
        </div>
      </Modal>

      {/* Modal gabung */}
      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Gabung Circle">
        <div className="space-y-4">
          <Input
            label="Kode undangan"
            placeholder="TEA7K2P9"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="text-center font-mono text-xl tracking-widest"
            maxLength={12}
            autoFocus
          />
          <p className="text-center text-xs text-muted">
            Minta kode ke bendahara circlemu.
          </p>
          {joinErr && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {joinErr}
            </p>
          )}
          <Button size="lg" loading={joining} disabled={!joinCode.trim()} onClick={handleJoin}>
            Gabung
          </Button>
        </div>
      </Modal>

      <ProfileEditModal
        open={showProfile}
        currentName={user?.name ?? ""}
        currentEmail={user?.email ?? ""}
        onClose={() => setShowProfile(false)}
        onSave={handleProfileSave}
      />
    </main>
  );
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

function DropIconBig() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-muted">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M15 3h4a1 1 0 0 1 1 1v4M9 21H5a1 1 0 0 1-1-1v-4M21 15v4a1 1 0 0 1-1 1h-4M9 9h6v6H9z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
