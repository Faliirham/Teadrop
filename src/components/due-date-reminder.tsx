"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CircleDetail } from "@/lib/api";

type ReminderProps = {
  detail: CircleDetail;
};

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr + "T23:59:59").getTime();
  return Math.ceil((due - Date.now()) / 86_400_000);
}

/** Client-side due-date reminder banner + optional browser Notification. */
export function DueDateReminder({ detail }: ReminderProps) {
  const active = detail.periods.find((p) => !p.is_closed);
  const [dismissed, setDismissed] = useState(false);
  const sentRef = useRef(false);

  const days = useMemo(
    () => (active ? daysUntil(active.due_date) : null),
    [active]
  );

  // Send a browser notification (user opt-in) once when a period is due soon.
  useEffect(() => {
    if (!active || days === null || days > 3 || sentRef.current) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const msg =
        days === 0
          ? `Hari ini jatuh tempo "${active.name}"!`
          : `"${active.name}" jatuh tempo ${days} hari lagi.`;
      new Notification("Teadrop — Ingatkan iuran", {
        body: msg,
        tag: `teadrop-due-${active.id}`,
      });
      sentRef.current = true;
    }
  }, [active, days]);

  const canAsk =
    "Notification" in window && Notification.permission === "default";

  const needsBanner =
    !dismissed &&
    active &&
    days !== null &&
    (days < 0 || days <= 3) &&
    !active.is_closed;

  if (!needsBanner) return null;

  const overdue = days! < 0;
  const isToday = days === 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        overdue
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300"
      }`}
    >
      <span className="shrink-0 text-muted">{overdue ? <AlertIcon /> : <CalendarIcon />}</span>
      <div className="flex-1 text-sm leading-snug">
        <b>{active!.name}</b>{" "}
        {overdue
          ? `sudah lewat ${Math.abs(days!)} hari.`
          : isToday
            ? "jatuh tempo hari ini!"
            : `jatuh tempo ${days} hari lagi.`}
      </div>
      {canAsk && (
        <button
          onClick={() => Notification.requestPermission()}
          className="shrink-0 rounded-lg bg-surface-2 px-3 py-1 text-xs font-semibold transition hover:bg-surface-2/70"
        >
          Aktifkan notifikasi
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-xs opacity-50 transition hover:opacity-100"
        aria-label="Tutup pengingat"
      >
        ✕
      </button>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
