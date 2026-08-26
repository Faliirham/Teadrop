"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Badge, Button, Card, EmptyState, Input, Modal, idr } from "@/components/ui";
import {
  useCircleDetail,
  useCircleRealtime,
  useDemoSync,
  useSession,
} from "@/hooks/use-teadrop";
import * as api from "@/lib/api";
import type { CircleDetail } from "@/lib/api";
import type { Contribution, Period } from "@/types/db";

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

function paidSum(
  detail: CircleDetail,
  memberId: string,
  periodId: string
): number {
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
  lunas: "green",
  sebagian: "amber",
  belum: "red",
} as const;
const STATUS_LABEL = { lunas: "Lunas", sebagian: "Sebagian", belum: "Belum" } as const;

const METHOD_TONE = {
  cash: "slate",
  transfer: "sky",
  qris: "green",
  other: "amber",
} as const;

function Avatar({ name }: { name?: string | null }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
      {initial}
    </span>
  );
}

// ---------- page ----------

type Tab = "ringkasan" | "anggota" | "periode" | "riwayat";

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  useDemoSync();
  useCircleRealtime(id);

  const { data: user } = useSession();
  const { data, isLoading, error } = useCircleDetail(id, true);

  const [tab, setTab] = useState<Tab>("ringkasan");
  const [copied, setCopied] = useState(false);

  // modals
  const [showBalance, setShowBalance] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payPeriod, setPayPeriod] = useState<Period | null>(null);
  const [payMember, setPayMember] = useState<string>("");
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["circle", id] });

  const isAdmin = data?.myRole === "admin";
  const activePeriod = data?.periods.find((p) => !p.is_closed) ?? null;

  // ---- actions ----

  const doCopyCode = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.circle.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const doRegenerate = async () => {
    if (!confirm("Ganti kode undangan? Kode lama tidak berlaku.")) return;
    await api.regenerateInvite(id);
    refresh();
  };

  const doSetRole = async (memberId: string, role: "admin" | "member") => {
    await api.setMemberRole(memberId, role);
    refresh();
  };

  const doRemoveMember = async (memberId: string, name?: string | null) => {
    if (!confirm(`Keluarkan ${name ?? "anggota ini"} dari circle?`)) return;
    await api.removeMember(memberId);
    refresh();
  };

  const doLeave = async () => {
    if (!confirm("Keluar dari circle ini?")) return;
    await api.leaveCircle(id);
    router.replace("/");
  };

  const doDeleteCircle = async () => {
    if (!confirm("HAPUS circle ini permanen dari daftar? Riwayat tidak bisa diakses lagi.")) return;
    await api.deleteCircleSoft(id);
    await qc.invalidateQueries({ queryKey: ["circles"] });
    router.replace("/");
  };

  const doClosePeriod = async (p: Period) => {
    if (
      !confirm(
        `Tutup periode "${p.name}"? Periode yang ditutup tidak bisa diubah lagi (read-only permanen).`
      )
    )
      return;
    await api.closePeriod(p.id);
    refresh();
  };

  const doDeleteContribution = async (c: Contribution) => {
    if (!confirm(`Hapus pembayaran ${idr(Number(c.amount))}?`)) return;
    await api.deleteContribution(c.id);
    refresh();
  };

  // ---- render states ----

  if (error || (data && !data.circle)) {
    return (
      <Shell>
        <EmptyState emoji="🫗" title="Circle tidak ditemukan">
          <Link href="/" className="text-sm font-semibold text-emerald-600 hover:underline">
            ← Kembali ke beranda
          </Link>
        </EmptyState>
      </Shell>
    );
  }

  if (isLoading || !data) {
    return (
      <Shell>
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "ringkasan", label: "Ringkasan" },
    { key: "anggota", label: `Anggota (${data.members.length})` },
    { key: "periode", label: "Periode" },
    { key: "riwayat", label: "Riwayat" },
  ];

  return (
    <Shell>
      {/* Header circle */}
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="text-slate-400 hover:text-slate-600">
          ←
        </Link>
        <h1 className="truncate text-lg font-extrabold text-slate-900">
          {data.circle.name}
        </h1>
      </div>

      {/* Tab bar */}
      <nav className="sticky top-0 z-10 -mx-4 mb-5 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
        <div className="flex max-w-full gap-1 overflow-x-auto py-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:bg-slate-100"
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
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-md">
            <div className="flex items-start justify-between">
              <p className="text-sm text-emerald-100">Dana terkumpul saat ini</p>
              {isAdmin && (
                <button
                  onClick={() => setShowBalance(true)}
                  className="rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
                >
                  Update Saldo
                </button>
              )}
            </div>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">
              {bal ? idr(Number(bal.new_amount)) : idr(0)}
            </p>
            {bal && delta !== 0 && (
              <p className={`mt-1 text-xs ${delta > 0 ? "text-emerald-200" : "text-rose-200"}`}>
                {delta > 0 ? "▲ naik" : "▼ turun"} {idr(Math.abs(delta))} · diperbarui{" "}
                {fmtDate(bal.created_at)}
              </p>
            )}
            {!bal && (
              <p className="mt-1 text-xs text-emerald-100/80">
                Belum ada catatan saldo — bendahara bisa meng-update manual.
              </p>
            )}
          </div>

          {/* Periode aktif */}
          {activePeriod ? (
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{activePeriod.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Jatuh tempo {fmtDate(activePeriod.due_date)} ·{" "}
                    {(() => {
                      const d = daysUntil(activePeriod.due_date);
                      if (d < 0) return <span className="text-rose-500">terlambat {-d} hari</span>;
                      if (d === 0) return <span className="text-amber-600">hari ini!</span>;
                      return `${d} hari lagi`;
                    })()}
                  </p>
                </div>
                <Badge tone={activePeriod.is_closed ? "slate" : "green"}>
                  {activePeriod.is_closed ? "Ditutup" : "Aktif"}
                </Badge>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Terkumpul {idr(collected)}</span>
                  <span>Target {idr(target)}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${target > 0 ? Math.min(100, (collected / target) * 100) : 0}%` }}
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
                      <span className="flex-1 truncate text-sm font-medium text-slate-700">
                        {m.profile?.full_name ?? "Anggota"}
                        {m.user_id === user?.id && (
                          <span className="ml-1 text-xs text-slate-400">(kamu)</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-400">
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
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          Catat
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {isAdmin && (
                <Button
                  size="lg"
                  className="mt-4 w-full"
                  onClick={() => {
                    setPayPeriod(activePeriod);
                    setPayMember("");
                    setShowPay(true);
                  }}
                >
                  ＋ Catat Pembayaran
                </Button>
              )}

              {!isAdmin && myMembership && (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-2.5 text-center text-xs text-slate-500">
                  Status kamu:{" "}
                  <b>{STATUS_LABEL[statusOf(data, myMembership.id, activePeriod)]}</b>{" "}
                  · hubungi bendahara kalau sudah transfer tapi belum dicatat
                </p>
              )}
            </Card>
          ) : (
            <EmptyState
              emoji="🗓️"
              title="Belum ada periode aktif"
              desc={
                isAdmin
                  ? "Buat periode iuran baru untuk mulai mengumpulkan."
                  : "Tunggu bendahara membuka periode iuran berikutnya."
              }
            >
              <div />
            </EmptyState>
          )}
        </div>
      )}

      {/* ================= ANGGOTA ================= */}
      {tab === "anggota" && (
        <div className="space-y-4">
          {/* Kode undangan */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50">
            <p className="text-sm font-medium text-slate-600">Kode undangan</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="flex-1 rounded-xl bg-white px-4 py-3 text-center font-mono text-2xl font-extrabold tracking-[0.3em] text-emerald-800 ring-1 ring-emerald-200">
                {data.circle.invite_code}
              </code>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={doCopyCode}>
                {copied ? "✓ Tersalin!" : "Salin"}
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={doRegenerate}>
                  Ganti kode
                </Button>
              )}
            </div>
          </Card>

          {/* Daftar anggota */}
          <Card className="divide-y divide-slate-100 p-0">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={m.profile?.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {m.profile?.full_name ?? "Tanpa nama"}
                    {m.user_id === user?.id && (
                      <span className="ml-1 text-xs text-slate-400">(kamu)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    gabung {fmtDate(m.joined_at)}
                  </p>
                </div>
                <Badge tone={m.role === "admin" ? "green" : "slate"}>
                  {m.role === "admin" ? "Bendahara" : "Anggota"}
                </Badge>
                {isAdmin && m.user_id !== user?.id && (
                  <>
                    <button
                      onClick={() => doSetRole(m.id, m.role === "admin" ? "member" : "admin")}
                      className="text-xs font-bold text-sky-600 hover:text-sky-700"
                      title="Ubah role"
                    >
                      {m.role === "admin" ? "↓ anggota" : "↑ bendahara"}
                    </button>
                    <button
                      onClick={() => doRemoveMember(m.id, m.profile?.full_name)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600"
                    >
                      keluarkan
                    </button>
                  </>
                )}
              </div>
            ))}
          </Card>

          {/* Zona bahaya */}
          <Card className="border-rose-100">
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
              ＋ Periode Baru
            </Button>
          )}

          {data.periods.length === 0 && (
            <EmptyState
              emoji="🗓️"
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
            const lunas = data.members.filter(
              (m) => statusOf(data, m.id, p) === "lunas"
            ).length;

            return (
              <Card key={p.id} className="p-0 overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
                  onClick={() => setExpanded(expandedOn ? null : p.id)}
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {p.name} {p.is_closed && "🔒"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Tempo {fmtDate(p.due_date)} · {idr(Number(p.amount_per_member))}/org
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={p.is_closed ? "slate" : "green"}>
                      {p.is_closed ? "Ditutup" : "Aktif"}
                    </Badge>
                    <p className="mt-1 text-xs text-slate-400">
                      {lunas}/{data.members.length} lunas
                    </p>
                  </div>
                </button>

                {expandedOn && (
                  <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                    <div className="mb-3 flex justify-between text-xs text-slate-500">
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
                              <span className="flex-1 truncate text-sm text-slate-700">
                                {m.profile?.full_name}
                              </span>
                              <span className="text-xs text-slate-400">
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
                                  className="text-xs font-bold text-emerald-600"
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
                                  className="ml-11 block text-left text-[11px] text-slate-300 hover:text-rose-500"
                                >
                                  ↳ {fmtDate(r.paid_at)} {idr(Number(r.amount))} ({r.method}) ✕
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
                        Tutup Periode 🔒
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
          {[...data.periods].map((p) => {
            const rows = data.contributions.filter((c) => c.period_id === p.id);
            if (rows.length === 0) return null;
            return (
              <div key={p.id}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  {p.name} {p.is_closed && <span title="ditutup">🔒</span>}
                </h3>
                <Card className="divide-y divide-slate-100 p-0">
                  {rows.map((c) => {
                    const member = data.members.find((m) => m.id === c.member_id);
                    const canDelete =
                      isAdmin && !p.is_closed;
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar name={member?.profile?.full_name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {member?.profile?.full_name ?? "?"}
                            {c.note && (
                              <span className="ml-1 text-xs italic text-slate-400">
                                “{c.note}”
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">
                            {fmtDate(c.paid_at)} oleh{" "}
                            {data.members.find((m) => m.user_id === c.recorded_by)?.profile
                              ?.full_name ?? "?"}
                          </p>
                        </div>
                        <Badge tone={METHOD_TONE[c.method]}>{c.method}</Badge>
                        <span className="text-sm font-bold text-emerald-700">
                          {idr(Number(c.amount))}
                        </span>
                        {canDelete && (
                          <button
                            onClick={() => doDeleteContribution(c)}
                            className="text-xs text-slate-300 hover:text-rose-500"
                            title="hapus"
                          >
                            ✕
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
            <h3 className="mb-2 text-sm font-bold text-slate-700">Riwayat Saldo</h3>
            {data.balances.length === 0 ? (
              <EmptyState emoji="🏦" title="Belum ada update saldo" />
            ) : (
              <Card className="divide-y divide-slate-100 p-0">
                {data.balances.map((b) => {
                  const by = data.members.find((m) => m.user_id === b.recorded_by);
                  const diff = Number(b.new_amount) - Number(b.previous_amount);
                  return (
                    <div key={b.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">
                          {idr(Number(b.new_amount))}
                        </p>
                        <Badge tone={diff >= 0 ? "green" : "red"}>
                          {diff >= 0 ? "+" : ""}
                          {idr(diff)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{b.note}</p>
                      <p className="text-[11px] text-slate-300">
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

      {/* ================= MODALS ================= */}

      <BalanceModal
        open={showBalance}
        currentAmount={bal ? Number(bal.new_amount) : 0}
        onClose={() => setShowBalance(false)}
        onDone={async () => {
          setShowBalance(false);
          await refresh();
        }}
      />

      {payPeriod && (
        <RecordPaymentModal
          open={showPay}
          detail={data}
          period={payPeriod}
          presetMemberId={payMember}
          onClose={() => setShowPay(false)}
          onDone={async () => {
            setShowPay(false);
            await refresh();
          }}
        />
      )}

      <CreatePeriodModal
        open={showNewPeriod}
        defaultAmount={Number(data.circle.default_amount) || 0}
        suggestedName={new Date().toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        })}
        onClose={() => setShowNewPeriod(false)}
        onDone={async () => {
          setShowNewPeriod(false);
          await refresh();
        }}
      />
    </Shell>
  );
}

// ---------- shell & modal komponen ----------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">{children}</div>
    </main>
  );
}

function BalanceModal({
  open,
  currentAmount,
  onClose,
  onDone,
}: {
  open: boolean;
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
      await api.updateBalance(
        // circleId dari closure halaman — ambil dari URL agar aman
        window.location.pathname.split("/")[2],
        Number(amount),
        note
      );
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
      <p className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-700">
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
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>
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
  presetMemberId,
  onClose,
  onDone,
}: {
  open: boolean;
  detail: CircleDetail;
  period: Period;
  presetMemberId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [memberId, setMemberId] = useState(presetMemberId);
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
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">Anggota</span>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">— pilih anggota —</option>
            {detail.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.profile?.full_name ?? "?"} — sudah {idr(paidSum(detail, m.id, period.id))}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Nominal (Rp)"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">Metode</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Contribution["method"])}
            className="w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 outline-none focus:border-emerald-500"
          >
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
            <option value="cash">Cash</option>
            <option value="other">Lainnya</option>
          </select>
        </label>

        <Input
          label="Catatan (opsional)"
          placeholder="mis. bayar duluan biar cepat 😄"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
        />

        {err && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>
        )}
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          disabled={!memberId || !Number(amount)}
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
  suggestedName,
  defaultAmount,
  onClose,
  onDone,
}: {
  open: boolean;
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
      const circleId = window.location.pathname.split("/")[2];
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
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>
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
        <p className="text-center text-xs text-slate-400">
          Hanya satu periode aktif dalam satu waktu. Setelah ditutup, periode
          menjadi read-only permanen.
        </p>
      </div>
    </Modal>
  );
}
