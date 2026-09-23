"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Badge, Button, Card, EmptyState, Input, Modal, Select, Skeleton, idr } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm";
import { DueDateReminder } from "@/components/due-date-reminder";
import { BarChart, HorizontalBars } from "@/components/charts";
import { DiaryFeed, DiaryComposer } from "@/components/diary";
import { Gallery } from "@/components/gallery";
import { MeetupCalendar } from "@/components/meetup-calendar";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { exportBalanceHistoryCsv, exportContributionsCsv } from "@/lib/csv";
import {
  useCircleDetail,
  useCircleRealtime,
  useDemoSync,
  useMeetups,
  useMoments,
  useSession,
} from "@/hooks/use-teadrop";
import * as api from "@/lib/api";
import type { CircleDetail } from "@/lib/api";
import type { Contribution, MomentPhoto, Period } from "@/types/db";

// ---------- helpers ----------

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr + "T23:59:59").getTime();
  return Math.ceil((due - Date.now()) / 86_400_000);
}

function paidSum(detail: CircleDetail, memberId: string, periodId: string): number {
  return detail.contributions
    .filter((c) => c.member_id === memberId && c.period_id === periodId)
    .reduce((s, c) => s + Number(c.amount), 0);
}

type PayStatus = "lunas" | "sebagian" | "belum";

function statusOf(detail: CircleDetail, memberId: string, p: Period): PayStatus {
  const paid = paidSum(detail, memberId, p.id);
  const expected = Number(p.amount_per_member);
  if (paid >= expected && expected > 0) return "lunas";
  if (paid > 0) return "sebagian";
  return "belum";
}

const STATUS_TONE = {
  lunas: "indigo",
  sebagian: "amber",
  belum: "red",
} as const;
const STATUS_LABEL = { lunas: "Lunas", sebagian: "Sebagian", belum: "Belum" } as const;

const METHOD_TONE = {
  cash: "slate",
  transfer: "sky",
  qris: "indigo",
  other: "amber",
} as const;

// ---------- icons (SVG, no emoji) ----------

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function Avatar({ name }: { name?: string | null }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">
      {initial}
    </span>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ---------- page ----------

type Tab = "ringkasan" | "anggota" | "periode" | "riwayat" | "statistik" | "dokumentasi";

export default function CircleManager({ circleId }: { circleId?: string }) {
  const params = useParams<{ id?: string }>();
  const id = circleId ?? params?.id ?? "";
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  useDemoSync();
  useCircleRealtime(id);

  const { data: user } = useSession();
  const { data, isLoading, error } = useCircleDetail(id, true);
  const { data: moments = [] } = useMoments(id, true);
  const { data: meetups = [] } = useMeetups(id, true);

  const [tab, setTab] = useState<Tab>("ringkasan");
  const [copied, setCopied] = useState(false);
  const [readLink, setReadLink] = useState<string | null>(null);

  // modals
  const [showBalance, setShowBalance] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payPeriod, setPayPeriod] = useState<Period | null>(null);
  const [payMember, setPayMember] = useState<string>("");
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["circle", id] });

  const isAdmin = data?.myRole === "admin";
  const activePeriod = data?.periods.find((p) => !p.is_closed) ?? null;

  // ---- actions ----

  const doCopyCode = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.circle.invite_code);
    setCopied(true);
    toast.success("Kode undangan disalin");
    setTimeout(() => setCopied(false), 1500);
  };

  const doRegenerate = async () => {
    const ok = await confirm({
      title: "Ganti kode undangan?",
      message: "Kode lama tidak berlaku lagi. Anggota perlu memakai kode baru.",
      confirmLabel: "Ganti Kode",
    });
    if (!ok) return;
    await api.regenerateInvite(id);
    toast.success("Kode undangan baru dibuat");
    refresh();
  };

  const doCopyReadLink = async () => {
    try {
      const token = readLink ?? (await api.getCircleReadToken(id));
      setReadLink(token);
      const link = `${window.location.origin}/c/${token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link lihat disalin");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat link lihat");
    }
  };

  const doRotateReadLink = async () => {
    const ok = await confirm({
      title: "Putar ulang link lihat?",
      message:
        "Link lihat lama langsung tidak berlaku. Orang dengan link lama tidak bisa membukanya lagi.",
      confirmLabel: "Putar Ulang",
    });
    if (!ok) return;
    const token = await api.rotateReadToken(id);
    setReadLink(token);
    toast.success("Link lihat baru dibuat");
  };

  const doSetRole = async (memberId: string, role: "admin" | "member") => {
    await api.setMemberRole(memberId, role);
    toast.success(
      role === "admin" ? "Anggota dijadikan bendahara" : "Role diubah menjadi anggota"
    );
    refresh();
  };

  const doRemoveMember = async (memberId: string, name?: string | null) => {
    const ok = await confirm({
      title: "Keluarkan anggota?",
      message: `${name ?? "Anggota ini"} akan dihapus dari circle.`,
      danger: true,
      confirmLabel: "Keluarkan",
    });
    if (!ok) return;
    await api.removeMember(memberId);
    toast.success("Anggota dikeluarkan");
    refresh();
  };

  const doLeave = async () => {
    const ok = await confirm({
      title: "Keluar dari circle?",
      message: "Kamu bisa bergabung lagi nanti pakai kode undangan.",
      danger: true,
      confirmLabel: "Keluar",
    });
    if (!ok) return;
    await api.leaveCircle(id);
    toast.info("Kamu keluar dari circle");
    router.replace("/");
  };

  const doDeleteCircle = async () => {
    const ok = await confirm({
      title: "Hapus circle ini?",
      message: "Permanen dari daftar dan riwayat tidak bisa diakses lagi.",
      danger: true,
      confirmLabel: "Hapus",
    });
    if (!ok) return;
    await api.deleteCircleSoft(id);
    toast.success("Circle dihapus");
    await qc.invalidateQueries({ queryKey: ["circles"] });
    router.replace("/");
  };

  const doClosePeriod = async (p: Period) => {
    const ok = await confirm({
      title: `Tutup periode "${p.name}"?`,
      message: "Periode yang ditutup tidak bisa diubah lagi (read-only permanen).",
      danger: true,
      confirmLabel: "Tutup Periode",
    });
    if (!ok) return;
    await api.closePeriod(p.id);
    toast.success("Periode ditutup");
    refresh();
  };

  const doDeleteContribution = async (c: Contribution) => {
    const ok = await confirm({
      title: "Hapus pembayaran?",
      message: `Hapus pembayaran ${idr(Number(c.amount))} yang tercatat.`,
      danger: true,
      confirmLabel: "Hapus",
    });
    if (!ok) return;
    await api.deleteContribution(c.id);
    toast.info("Pembayaran dihapus");
    refresh();
  };

  const doDeleteMoment = async (momentId: string) => {
    await api.deleteMoment(momentId);
    toast.info("Momen dihapus");
    refresh();
  };

  const doCreateMeetup = async (input: {
    title: string;
    description: string;
    location: string;
    startAt: string;
  }) => {
    await api.createMeetup({ circleId: id, ...input });
    toast.success("Acara dibuat");
    refresh();
  };

  const myMemberId =
    data?.members.find((m) => m.user_id === user?.id)?.id ?? "";

  const doRsvpMeetup = async (meetupId: string, status: "going" | "maybe" | "declined") => {
    if (!user || !myMemberId) {
      toast.error("Kamu belum jadi anggota circle ini");
      return;
    }
    try {
      await api.rsvpMeetup(meetupId, myMemberId, status);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan RSVP");
    }
  };

  const doDeleteMeetup = async (meetupId: string) => {
    const ok = await confirm({
      title: "Hapus acara ini?",
      message: "Data RSVP juga akan dihapus.",
      danger: true,
      confirmLabel: "Hapus",
    });
    if (!ok) return;
    await api.deleteMeetup(meetupId);
    toast.info("Acara dihapus");
    refresh();
  };

  // ---- render states ----

  if (error || (data && !data.circle)) {
    return (
      <Shell>
        <EmptyState icon={<GlassIcon />} title="Circle tidak ditemukan">
          <Link
            href="/"
            className="text-sm font-semibold text-accent hover:underline"
          >
            Kembali ke beranda
          </Link>
        </EmptyState>
      </Shell>
    );
  }

  if (isLoading || !data) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </Shell>
    );
  }

  const bal = data.latestBalance;
  const delta = bal ? Number(bal.new_amount) - Number(bal.previous_amount) : 0;

  const collected = activePeriod
    ? data.contributions
        .filter((c) => c.period_id === activePeriod.id)
        .reduce((s, c) => s + Number(c.amount), 0)
    : 0;
  const target = activePeriod
    ? Number(activePeriod.amount_per_member) * data.members.length
    : 0;

  const myMembership = data.members.find((m) => m.user_id === user?.id);

  const allPhotos: MomentPhoto[] = moments.reduce<MomentPhoto[]>(
    (acc, m) => [...acc, ...m.photos],
    []
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "ringkasan", label: "Ringkasan" },
    { key: "anggota", label: `Anggota (${data.members.length})` },
    { key: "periode", label: "Periode" },
    { key: "riwayat", label: "Riwayat" },
    { key: "statistik", label: "Statistik" },
    { key: "dokumentasi", label: "Dokumentasi" },
  ];

  return (
    <Shell>
      {/* Header circle */}
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/"
          aria-label="Kembali"
          className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          <ArrowLeft />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold text-foreground">
          {data.circle.name}
        </h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-foreground"
            title="Pengaturan circle"
          >
            <SettingsIcon />
          </button>
        )}
        <ThemeToggle />
      </div>

      <div className="mb-4">
        <DueDateReminder detail={data} />
      </div>

      {/* Tab bar */}
      <nav className="sticky top-0 z-10 -mx-4 mb-5 border-b border-border bg-surface/70 px-4 backdrop-blur-xl">
        <div className="flex max-w-full gap-1 overflow-x-auto py-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-accent-strong text-white"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ================= RINGKASAN ================= */}
      {tab === "ringkasan" && (
        <div className="space-y-4">
          {/* Saldo */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-500/30 via-surface to-surface p-6 text-foreground shadow-[0_10px_40px_-18px_rgba(99,102,241,0.5)]">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted">Dana terkumpul saat ini</p>
              {isAdmin && (
                <button
                  onClick={() => setShowBalance(true)}
                  className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-white/20"
                >
                  Update Saldo
                </button>
              )}
            </div>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">
              {bal ? idr(Number(bal.new_amount)) : idr(0)}
            </p>
            {bal && delta !== 0 && (
              <p className={`mt-1 text-xs ${delta > 0 ? "text-accent" : "text-rose-400"}`}>
                {delta > 0 ? "naik" : "turun"} {idr(Math.abs(delta))} · diperbarui{" "}
                {fmtDate(bal.created_at)}
              </p>
            )}
            {!bal && (
              <p className="mt-1 text-xs text-muted">
                Belum ada catatan saldo — bendahara bisa meng-update manual.
              </p>
            )}
          </div>

          {/* Periode aktif */}
          {activePeriod ? (
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-foreground">{activePeriod.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Jatuh tempo {fmtDate(activePeriod.due_date)} ·{" "}
                    {(() => {
                      const d = daysUntil(activePeriod.due_date);
                      if (d < 0) return <span className="text-rose-400">terlambat {-d} hari</span>;
                      if (d === 0) return <span className="text-amber-400">hari ini!</span>;
                      return `${d} hari lagi`;
                    })()}
                  </p>
                </div>
                <Badge tone={activePeriod.is_closed ? "slate" : "indigo"}>
                  {activePeriod.is_closed ? "Ditutup" : "Aktif"}
                </Badge>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted">
                  <span>Terkumpul {idr(collected)}</span>
                  <span>Target {idr(target)}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent-strong transition-all"
                    style={{
                      width: `${target > 0 ? Math.min(100, (collected / target) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Status per anggota */}
              <div className="mt-4 space-y-2">
                {data.members.map((m) => {
                  const st = statusOf(data, m.id, activePeriod);
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar name={m.profile?.full_name} />
                      <span className="flex-1 truncate text-sm font-medium text-foreground">
                        {m.profile?.full_name ?? "Anggota"}
                        {m.user_id === user?.id && (
                          <span className="ml-1 text-xs text-muted">(kamu)</span>
                        )}
                      </span>
                      <span className="text-xs text-muted">
                        {idr(paidSum(data, m.id, activePeriod.id))}
                      </span>
                      <Badge tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Badge>
                      {isAdmin && st !== "lunas" && (
                        <button
                          onClick={() => {
                            setPayPeriod(activePeriod);
                            setPayMember(m.id);
                            setShowPay(true);
                          }}
                          className="text-xs font-bold text-accent transition hover:text-accent-strong"
                        >
                          Catat
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isAdmin && myMembership && (
                <p className="mt-3 rounded-xl bg-surface-2 px-4 py-2.5 text-center text-xs text-muted">
                  Status kamu:{" "}
                  <b>{STATUS_LABEL[statusOf(data, myMembership.id, activePeriod)]}</b>{" "}
                  · hubungi bendahara kalau sudah transfer tapi belum dicatat
                </p>
              )}
            </Card>
          ) : (
            <EmptyState
              icon={<CalIcon />}
              title="Belum ada periode aktif"
              desc={
                isAdmin
                  ? "Buat periode iuran baru untuk mulai mengumpulkan."
                  : "Tunggu bendahara membuka periode iuran berikutnya."
              }
            />
          )}
        </div>
      )}

      {/* ================= ANGGOTA ================= */}
      {tab === "anggota" && (
        <div className="space-y-4">
          {/* Kode undangan */}
          <SpotlightCard>
            <p className="text-sm font-medium text-muted">Kode undangan</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="flex-1 rounded-xl bg-surface-2 px-4 py-3 text-center font-mono text-2xl font-extrabold tracking-[0.3em] text-accent ring-1 ring-border">
                {data.circle.invite_code}
              </code>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={doCopyCode}>
                {copied ? "Tersalin!" : "Salin"}
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={doRegenerate}>
                  Ganti kode
                </Button>
              )}
            </div>
          </SpotlightCard>

          {/* Link lihat (read-only) — admin */}
          {isAdmin && (
            <SpotlightCard>
              <div className="flex items-center gap-2">
                <LinkIcon />
                <p className="text-sm font-medium text-foreground">Link lihat (tanpa login)</p>
              </div>
              <p className="mt-1 text-xs text-muted">
                Siapa pun dengan link ini bisa melihat snapshot keuangan circle, tanpa bisa
                mengedit. Bagikan ke bendahara rekanan atau arsip.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={doCopyReadLink}>
                  Salin link lihat
                </Button>
                <Button variant="ghost" size="sm" onClick={doRotateReadLink}>
                  Putar ulang link
                </Button>
              </div>
            </SpotlightCard>
          )}

          {/* Daftar anggota */}
          <Card className="divide-y divide-border p-0">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={m.profile?.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {m.profile?.full_name ?? "Tanpa nama"}
                    {m.user_id === user?.id && (
                      <span className="ml-1 text-xs text-muted">(kamu)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">gabung {fmtDate(m.joined_at)}</p>
                </div>
                <Badge tone={m.role === "admin" ? "indigo" : "slate"}>
                  {m.role === "admin" ? "Bendahara" : "Anggota"}
                </Badge>
                {isAdmin && m.user_id !== user?.id && (
                  <>
                    <button
                      onClick={() => doSetRole(m.id, m.role === "admin" ? "member" : "admin")}
                      className="text-xs font-bold text-sky-400 transition hover:text-sky-300"
                      title="Ubah role"
                    >
                      {m.role === "admin" ? "anggota" : "bendahara"}
                    </button>
                    <button
                      onClick={() => doRemoveMember(m.id, m.profile?.full_name)}
                      className="text-xs font-bold text-rose-400 transition hover:text-rose-300"
                    >
                      keluarkan
                    </button>
                  </>
                )}
              </div>
            ))}
          </Card>

          {/* Zona bahaya */}
          <Card className="border-rose-500/30">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rose-400">
              Zona berbahaya
            </p>
            {!isAdmin && (
              <Button variant="outline" size="md" className="w-full" onClick={doLeave}>
                Keluar dari circle
              </Button>
            )}
            {isAdmin && (
              <Button variant="danger" size="md" className="w-full" onClick={doDeleteCircle}>
                Hapus circle ini
              </Button>
            )}
          </Card>
        </div>
      )}

      {/* ================= PERIODE ================= */}
      {tab === "periode" && (
        <div className="space-y-3">
          {isAdmin && (
            <Button className="w-full" onClick={() => setShowNewPeriod(true)}>
              Periode Baru
            </Button>
          )}

          {data.periods.length === 0 && (
            <EmptyState
              icon={<CalIcon />}
              title="Belum ada periode"
              desc="Periode iuran biasanya bulanan — buat satu untuk mulai."
            />
          )}

          {data.periods.map((p) => {
            const expandedOn = expanded === p.id;
            const col = data.contributions
              .filter((c) => c.period_id === p.id)
              .reduce((s, c) => s + Number(c.amount), 0);
            const tgt = Number(p.amount_per_member) * data.members.length;
            const lunas = data.members.filter((m) => statusOf(data, m.id, p) === "lunas")
              .length;

            return (
              <Card key={p.id} className="overflow-hidden p-0">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-surface-2/60"
                  onClick={() => setExpanded(expandedOn ? null : p.id)}
                >
                  <div>
                    <p className="flex items-center gap-1.5 font-bold text-foreground">
                      {p.name} {p.is_closed && <LockIcon />}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Tempo {fmtDate(p.due_date)} · {idr(Number(p.amount_per_member))}/org
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={p.is_closed ? "slate" : "indigo"}>
                      {p.is_closed ? "Ditutup" : "Aktif"}
                    </Badge>
                    <p className="mt-1 text-xs text-muted">
                      {lunas}/{data.members.length} lunas
                    </p>
                  </div>
                </button>

                {expandedOn && (
                  <div className="border-t border-border px-5 pb-4 pt-3">
                    <div className="mb-3 flex justify-between text-xs text-muted">
                      <span>Terkumpul {idr(col)}</span>
                      <span>dari {idr(tgt)}</span>
                    </div>
                    <div className="space-y-2">
                      {data.members.map((m) => {
                        const st = statusOf(data, m.id, p);
                        const rows = data.contributions.filter(
                          (c) => c.member_id === m.id && c.period_id === p.id
                        );
                        return (
                          <div key={m.id}>
                            <div className="flex items-center gap-2 py-1">
                              <Avatar name={m.profile?.full_name} />
                              <span className="flex-1 truncate text-sm text-foreground">
                                {m.profile?.full_name}
                              </span>
                              <span className="text-xs text-muted">
                                {idr(paidSum(data, m.id, p.id))}
                              </span>
                              <Badge tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Badge>
                              {isAdmin && !p.is_closed && st !== "lunas" && (
                                <button
                                  onClick={() => {
                                    setPayPeriod(p);
                                    setPayMember(m.id);
                                    setShowPay(true);
                                  }}
                                  className="text-xs font-bold text-accent"
                                >
                                  Catat
                                </button>
                              )}
                            </div>
                            {isAdmin &&
                              !p.is_closed &&
                              rows.map((r) => (
                                <button
                                  key={r.id}
                                  onClick={() => doDeleteContribution(r)}
                                  className="ml-11 block text-left text-[11px] text-muted/50 transition hover:text-rose-400"
                                >
                                  {fmtDate(r.paid_at)} {idr(Number(r.amount))} ({r.method}) hapus
                                </button>
                              ))}
                          </div>
                        );
                      })}
                    </div>
                    {isAdmin && !p.is_closed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => doClosePeriod(p)}
                      >
                        Tutup Periode
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= RIWAYAT ================= */}
      {tab === "riwayat" && (
        <div className="space-y-6">
          {/* Ekspor CSV */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                exportBalanceHistoryCsv(data);
                toast.success("Riwayat saldo diekspor CSV");
              }}
            >
              Ekspor Riwayat Saldo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={data.periods.length === 0}
              onClick={() => {
                const open = data.periods.find((p) => !p.is_closed) ?? data.periods[0];
                exportContributionsCsv(data, open);
                toast.success("Pembayaran diekspor CSV");
              }}
            >
              Ekspor Pembayaran
            </Button>
          </div>

          {[...data.periods].map((p) => {
            const rows = data.contributions.filter((c) => c.period_id === p.id);
            if (rows.length === 0) return null;
            return (
              <div key={p.id}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  {p.name} {p.is_closed && <LockIcon />}
                </h3>
                <Card className="divide-y divide-border p-0">
                  {rows.map((c) => {
                    const member = data.members.find((m) => m.id === c.member_id);
                    const canDelete = isAdmin && !p.is_closed;
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar name={member?.profile?.full_name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {member?.profile?.full_name ?? "?"}
                            {c.note && (
                              <span className="ml-1 text-xs italic text-muted">
                                “{c.note}”
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted">
                            {fmtDate(c.paid_at)} oleh{" "}
                            {data.members.find((m) => m.user_id === c.recorded_by)?.profile
                              ?.full_name ?? "?"}
                          </p>
                        </div>
                        <Badge tone={METHOD_TONE[c.method]}>{c.method}</Badge>
                        <span className="text-sm font-bold text-accent">
                          {idr(Number(c.amount))}
                        </span>
                        {canDelete && (
                          <button
                            onClick={() => doDeleteContribution(c)}
                            className="text-xs text-muted/50 transition hover:text-rose-400"
                            title="hapus"
                          >
                            hapus
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}

          {/* Audit trail saldo */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-foreground">Riwayat Saldo</h3>
            {data.balances.length === 0 ? (
              <EmptyState icon={<BankIcon />} title="Belum ada update saldo" />
            ) : (
              <Card className="divide-y divide-border p-0">
                {data.balances.map((b) => {
                  const by = data.members.find((m) => m.user_id === b.recorded_by);
                  const diff = Number(b.new_amount) - Number(b.previous_amount);
                  return (
                    <div key={b.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {idr(Number(b.new_amount))}
                        </p>
                        <Badge tone={diff >= 0 ? "indigo" : "red"}>
                          {diff >= 0 ? "+" : ""}
                          {idr(diff)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{b.note}</p>
                      <p className="text-[11px] text-muted/50">
                        oleh {by?.profile?.full_name ?? "?"} · {fmtDate(b.created_at)}
                      </p>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ================= STATISTIK ================= */}
      {tab === "statistik" && (
        <div className="space-y-4">
          {/* Kartu ringkas */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Periode", value: String(data.periods.length) },
              {
                label: "Total iuran",
                value: idr(
                  data.contributions.reduce((s, c) => s + Number(c.amount), 0)
                ),
              },
              { label: "Pembayaran", value: String(data.contributions.length) },
            ].map((s) => (
              <Card key={s.label} className="p-4 text-center">
                <p className="break-words text-2xl font-extrabold text-accent">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Tren per periode */}
          <Card>
            <h3 className="mb-1 font-bold text-foreground">Tren Pengumpulan</h3>
            <p className="mb-3 text-xs text-muted">Total iuran terkumpul per periode</p>
            <BarChart
              data={[...data.periods]
                .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
                .map((p) => ({
                  label: p.name.length > 9 ? p.name.slice(0, 8) + "…" : p.name,
                  value: data.contributions
                    .filter((c) => c.period_id === p.id)
                    .reduce((s, c) => s + Number(c.amount), 0),
                }))}
            />
          </Card>

          {/* Kontribusi per anggota */}
          <Card>
            <h3 className="mb-1 font-bold text-foreground">Kontribusi per Anggota</h3>
            <p className="mb-3 text-xs text-muted">Akumulasi pembayaran seluruh periode</p>
            <HorizontalBars
              data={data.members
                .map((m) => ({
                  label: m.profile?.full_name ?? "Anggota",
                  value: data.contributions
                    .filter((c) => c.member_id === m.id)
                    .reduce((s, c) => s + Number(c.amount), 0),
                }))
                .sort((a, b) => b.value - a.value)}
            />
          </Card>

          {/* Tingkat kelunasan */}
          <Card>
            <h3 className="mb-2 font-bold text-foreground">Kelunasan per Periode</h3>
            <div className="space-y-2">
              {[...data.periods]
                .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
                .map((p) => {
                  const lunas = data.members.filter(
                    (m) => statusOf(data, m.id, p) === "lunas"
                  ).length;
                  const pct =
                    data.members.length > 0
                      ? Math.round((lunas / data.members.length) * 100)
                      : 0;
                  const enName = p.is_closed
                    ? "Ditutup"
                    : lunas >= data.members.length && data.members.length > 0
                      ? "Lunas"
                      : "Berjalan";
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs font-medium text-muted">
                        {p.name}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 100
                              ? "bg-accent-strong"
                              : pct >= 50
                                ? "bg-amber-400"
                                : "bg-rose-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-semibold text-muted">
                        {pct}%
                      </span>
                      <Badge tone={pct >= 100 ? "indigo" : pct >= 50 ? "amber" : "red"}>
                        {enName}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      )}

      {/* ================= DOKUMENTASI ================= */}
      {tab === "dokumentasi" && (
        <div className="space-y-4">
          {allPhotos.length > 0 && (
            <SpotlightCard className="p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Galeri ({allPhotos.length})
              </p>
              <Gallery photos={allPhotos} onClose={() => {}} />
            </SpotlightCard>
          )}

          <SpotlightCard className="p-4">
            <MeetupCalendar
              meetups={meetups}
              currentMemberId={myMemberId}
              isAdmin={isAdmin}
              onCreate={doCreateMeetup}
              onRsvp={doRsvpMeetup}
              onDelete={doDeleteMeetup}
            />
          </SpotlightCard>

          <DiaryFeed
            moments={moments}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            onDelete={doDeleteMoment}
          />

          <DiaryComposer
            onPost={async (content, files) => {
              await api.addMoment({ circleId: id, content, files });
              refresh();
            }}
          />
        </div>
      )}

      {/* ================= MODALS ================= */}

      <BalanceModal
        open={showBalance}
        circleId={id}
        currentAmount={bal ? Number(bal.new_amount) : 0}
        onClose={() => setShowBalance(false)}
        onDone={async () => {
          setShowBalance(false);
          toast.success("Saldo diperbarui");
          await refresh();
        }}
      />

      {payPeriod && (
        <RecordPaymentModal
          open={showPay}
          detail={data}
          period={payPeriod}
          memberId={payMember}
          onClose={() => setShowPay(false)}
          onDone={async () => {
            setShowPay(false);
            toast.success("Pembayaran tercatat");
            await refresh();
          }}
        />
      )}

      <CreatePeriodModal
        open={showNewPeriod}
        circleId={id}
        defaultAmount={Number(data.circle.default_amount) || 0}
        suggestedName={new Date().toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        })}
        onClose={() => setShowNewPeriod(false)}
        onDone={async () => {
          setShowNewPeriod(false);
          toast.success("Periode iuran dibuat");
          await refresh();
        }}
      />

      <CircleSettingsModal
        key={data.circle.id}
        open={showSettings}
        currentName={data.circle.name}
        currentDescription={data.circle.description ?? ""}
        onClose={() => setShowSettings(false)}
        onSave={async (name, description) => {
          await api.updateCircle(id, { name, description });
          setShowSettings(false);
          toast.success("Pengaturan circle diperbarui");
          await refresh();
        }}
      />
    </Shell>
  );
}

// ---------- shell & modal komponen ----------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">{children}</div>
    </main>
  );
}

function GlassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto h-10 w-10 text-muted">
      <path d="M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0Z" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-muted">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-muted">
      <path d="M3 21h18M4 21V10M20 21V10M4 10l8-6 8 6M8 21v-7M12 21v-7M16 21v-7" />
    </svg>
  );
}

function BalanceModal({
  open,
  circleId,
  currentAmount,
  onClose,
  onDone,
}: {
  open: boolean;
  circleId: string;
  currentAmount: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.updateBalance(circleId, Number(amount), note);
      setAmount("");
      setNote("");
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Update Saldo Manual">
      <p className="mb-4 rounded-xl bg-sky-500/10 px-4 py-3 text-xs leading-relaxed text-sky-300">
        Saldo saat ini: <b>{idr(currentAmount)}</b>. Setiap perubahan tercatat
        sebagai riwayat yang tidak bisa dihapus — isi catatan yang jelas ya.
      </p>
      <div className="space-y-4">
        <Input
          label="Saldo baru (Rp)"
          type="number"
          min={0}
          placeholder={String(currentAmount)}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        <Input
          label="Catatan wajib"
          placeholder="mis. setor RDPU Bibit bulan Agustus"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
        />
        {err && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>
        )}
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          disabled={!Number(amount) || !note.trim()}
          onClick={submit}
        >
          Simpan Saldo
        </Button>
      </div>
    </Modal>
  );
}

function RecordPaymentModal({
  open,
  detail,
  period,
  memberId,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: CircleDetail;
  period: Period;
  memberId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const memberName = detail.members.find((m) => m.id === memberId)?.profile?.full_name;
  const [amount, setAmount] = useState(String(period.amount_per_member));
  const [method, setMethod] = useState<Contribution["method"]>("transfer");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.addContribution({
        periodId: period.id,
        memberId,
        amount: Number(amount),
        method,
        note,
      });
      setNote("");
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Catat Pembayaran — ${period.name}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
          <Avatar name={memberName} />
          <div className="min-w-0">
            <p className="text-xs text-muted">Anggota</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {memberName ?? "Anggota"}
            </p>
          </div>
        </div>

        <Input
          label="Nominal (Rp)"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <Select
          label="Metode"
          value={method}
          onChange={(e) => setMethod(e.target.value as Contribution["method"])}
        >
          <option value="transfer">Transfer</option>
          <option value="qris">QRIS</option>
          <option value="cash">Cash</option>
          <option value="other">Lainnya</option>
        </Select>

        <Input
          label="Catatan (opsional)"
          placeholder="mis. bayar duluan biar cepat"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
        />

        {err && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>
        )}
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          disabled={!Number(amount)}
          onClick={submit}
        >
          Simpan Pembayaran
        </Button>
      </div>
    </Modal>
  );
}

function CreatePeriodModal({
  open,
  circleId,
  suggestedName,
  defaultAmount,
  onClose,
  onDone,
}: {
  open: boolean;
  circleId: string;
  suggestedName: string;
  defaultAmount: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState(suggestedName);
  const [due, setDue] = useState("");
  const [amount, setAmount] = useState(String(defaultAmount));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.addPeriod({
        circleId,
        name: name || suggestedName,
        dueDate: due,
        amountPerMember: Number(amount),
      });
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat periode");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Periode Iuran">
      <div className="space-y-4">
        <Input
          label="Nama periode"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <Input
          label="Tanggal jatuh tempo"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <Input
          label="Iuran per anggota (Rp)"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {err && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>
        )}
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          disabled={!due || !Number(amount)}
          onClick={submit}
        >
          Buat Periode
        </Button>
        <p className="text-center text-xs text-muted">
          Hanya satu periode aktif dalam satu waktu. Setelah ditutup, periode menjadi
          read-only permanen.
        </p>
      </div>
    </Modal>
  );
}

function CircleSettingsModal({
  open,
  currentName,
  currentDescription,
  onClose,
  onSave,
}: {
  open: boolean;
  currentName: string;
  currentDescription: string;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave(name.trim(), description.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pengaturan Circle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama circle"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
        />
        <Input
          label="Deskripsi"
          placeholder="Tentang circle ini..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button type="submit" loading={busy} className="flex-1">
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
