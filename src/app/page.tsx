"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { Badge, Button, Card, EmptyState, Input, Modal, idr } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";
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

  // Belum login → paksa ke /login
  useEffect(() => {
    if (!sessionLoading && !user) router.replace("/login");
  }, [sessionLoading, user, router]);

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
      toast.success("Circle berhasil dibuat 🎉");
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

  if (sessionLoading || (!user && !isDemoMode)) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-16 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              🍃 Teadrop
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-400">
              Halo, {user?.name} 👋
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
        {isDemoMode && (
          <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <b>MODE DEMO</b> — data contoh disimpan di browser ini. Isi{" "}
            <code>.env.local</code> dengan key Supabase untuk mode live.
          </div>
        )}
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6">
        {/* Aksi */}
        <div className="mb-5 flex gap-2">
          <Button size="md" onClick={() => setShowCreate(true)}>
            ＋ Buat Circle
          </Button>
          <Button variant="outline" size="md" onClick={() => setShowJoin(true)}>
            Gabung via Kode
          </Button>
        </div>

        {/* Daftar circle */}
        {circlesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : !circles || circles.length === 0 ? (
          <EmptyState
            emoji="🫗"
            title="Belum ada circle"
            desc="Buat circle baru untuk mulai nabung bareng, atau gabung lewat kode undangan dari temanmu."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {circles.map((c) => (
              <Link key={c.id} href={`/circles/${c.id}`} className="group">
                <Card className="transition-shadow group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold leading-snug text-slate-900 dark:text-slate-100">
                      {c.name}
                    </h2>
                    <Badge tone={c.role === "admin" ? "green" : "slate"}>
                      {c.role === "admin" ? "Bendahara" : "Anggota"}
                    </Badge>
                  </div>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400 dark:text-slate-400">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>👥 {c.memberCount} anggota</span>
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
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
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
          <p className="text-center text-xs text-slate-400">
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
          <p className="text-center text-xs text-slate-400">
            Minta kode ke bendahara circlemu.
          </p>
          {joinErr && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
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
