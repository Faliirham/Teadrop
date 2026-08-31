"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { Badge, Button, Card, EmptyState, Input, Modal, idr } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";
import { Landing } from "@/components/landing";
import { useDemoSync, useMyCircles, useSession } from "@/hooks/use-teadrop";
import * as api from "@/lib/api";
import { isDemoMode } from "@/lib/env";

export default function HomePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: user, isLoading: sessionLoading } = useSession();
  useDemoSync();

  const { data: circles, isLoading: circlesLoading } = useMyCircles(
    !!user || isDemoMode
  );

  // Belum login & bukan demo mode → tampilkan landing page (bukan paksa /login)
  const showLanding = !sessionLoading && !user && !isDemoMode;

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

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
    await qc.invalidateQueries();
    router.replace("/login");
    router.refresh();
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

  return (
    <main className="min-h-dvh pb-16">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
                <LeafIcon />
              </span>
              Teadrop
            </h1>
            <p className="text-xs text-muted">Halo, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
        {isDemoMode && (
          <div className="border-t border-border bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-300">
            <b>MODE DEMO</b> — data contoh disimpan di browser ini. Isi{" "}
            <code>.env.local</code> dengan key Supabase untuk mode live.
          </div>
        )}
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6">
        {/* Aksi */}
        <div className="mb-5 flex gap-2">
          <Button size="md" onClick={() => setShowCreate(true)}>
            <PlusIcon /> Buat Circle
          </Button>
          <Button variant="outline" size="md" onClick={() => setShowJoin(true)}>
            Gabung via Kode
          </Button>
        </div>

        {/* Daftar circle */}
        {circlesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : !circles || circles.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={<LeafIconBig />}
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
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {circles.map((c) => (
              <Link key={c.id} href={`/circles/${c.id}`} className="group">
                <Card className="transition-all group-hover:border-accent/40 group-hover:shadow-[0_10px_40px_-18px_rgba(16,185,129,0.4)]">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold leading-snug text-foreground">{c.name}</h2>
                    <Badge tone={c.role === "admin" ? "green" : "slate"}>
                      {c.role === "admin" ? "Bendahara" : "Anggota"}
                    </Badge>
                  </div>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon /> {c.memberCount} anggota
                    </span>
                    <span>Iuran {idr(c.default_amount)}/bln</span>
                  </div>
                </Card>
              </Link>
            ))}
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
    </main>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function LeafIconBig() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-muted">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
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

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
