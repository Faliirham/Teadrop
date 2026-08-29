"use client";

import type { CircleDetail } from "@/lib/api";
import type { Period } from "@/types/db";

function esc(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportContributionsCsv(
  detail: CircleDetail,
  period: Period
) {
  const memberName = (id: string) =>
    detail.members.find((m) => m.id === id)?.profile?.full_name ?? "?";

  const rows: (string | number)[][] = [
    ["Teadrop — Pembayaran Iuran"],
    ["Circle", detail.circle.name],
    ["Periode", period.name],
    ["Jatuh tempo", period.due_date],
    ["Dipilih pada", new Date().toLocaleString("id-ID")],
    [],
    [
      "Anggota",
      "Jumlah",
      "Tanggal Bayar",
      "Metode",
      "Catatan",
      "Dicatat oleh",
    ],
  ];

  const contributions = detail.contributions
    .filter((c) => c.period_id === period.id)
    .sort((a, b) => (a.paid_at < b.paid_at ? -1 : 1));

  for (const c of contributions) {
    const recorder = detail.members.find((m) => m.user_id === c.recorded_by)
      ?.profile?.full_name;
    rows.push([
      memberName(c.member_id),
      Number(c.amount),
      c.paid_at,
      c.method,
      c.note ?? "",
      recorder ?? "?",
    ]);
  }

  rows.push([], ["Total terkumpul", contributions.reduce((s, c) => s + Number(c.amount), 0)]);
  rows.push([
    "Target",
    Number(period.amount_per_member) * detail.members.length,
  ]);

  const safeName = `${detail.circle.name}-${period.name}`.replace(/[^\p{L}\p{N}]+/gu, "-");
  downloadCsv(`teadrop-${safeName}.csv`, rowsToCsv(rows));
}

export function exportBalanceHistoryCsv(detail: CircleDetail) {
  const rows: (string | number)[][] = [
    ["Teadrop — Riwayat Saldo"],
    ["Circle", detail.circle.name],
    ["Dipilih pada", new Date().toLocaleString("id-ID")],
    [],
    ["Tanggal", "Saldo Lama", "Saldo Baru", "Selisih", "Catatan", "Oleh"],
  ];

  const sortedBalances = [...detail.balances].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1
  );
  for (const b of sortedBalances) {
    const by = detail.members.find((m) => m.user_id === b.recorded_by)?.profile
      ?.full_name;
    const diff = Number(b.new_amount) - Number(b.previous_amount);
    rows.push([
      b.created_at,
      Number(b.previous_amount),
      Number(b.new_amount),
      diff,
      b.note,
      by ?? "?",
    ]);
  }

  if (detail.balances.length > 0) {
    const last = [...detail.balances].sort((a, b) =>
      a.created_at > b.created_at ? -1 : 1
    )[0];
    rows.push([], ["Saldo terakhir", Number(last.new_amount)]);
  }

  const safeName = detail.circle.name.replace(/[^\p{L}\p{N}]+/gu, "-");
  downloadCsv(`teadrop-saldo-${safeName}.csv`, rowsToCsv(rows));
}
