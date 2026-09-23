"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-white hover:bg-[#4f46e5] active:scale-[0.98] shadow-[0_8px_30px_-8px_rgba(99,102,241,0.5)]",
  outline:
    "border-border bg-surface/60 text-foreground hover:bg-surface-2 active:scale-[0.98] backdrop-blur-sm",
  danger: "bg-rose-500/90 text-white hover:bg-rose-500 active:scale-[0.98]",
  ghost:
    "text-muted hover:bg-surface-2 hover:text-foreground active:scale-[0.98]",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-xl",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "w-full px-4 py-3 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ease-out ${VARIANT[variant]} ${SIZE[size]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-2xl p-5 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-muted">
          {label}
        </span>
      )}
      <input
        {...props}
        className={`w-full rounded-xl border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent-soft ${
          error ? "border-rose-400" : "border-border"
        } ${className}`}
      />
      {hint && !error && (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

type Tone = "indigo" | "amber" | "red" | "slate" | "sky";

const TONE: Record<Tone, string> = {
  indigo: "bg-accent-soft text-accent ring-accent-strong/30",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  red: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
  slate: "bg-surface-2 text-muted ring-border",
  sky: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
};

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl shadow-2xl sm:rounded-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="mb-4 text-lg font-bold text-foreground">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  emoji,
  icon,
  title,
  desc,
  children,
}: {
  emoji?: string;
  icon?: ReactNode;
  title: string;
  desc?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
      {icon ?? (emoji ? <div className="text-4xl">{emoji}</div> : null)}
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      {desc && (
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{desc}</p>
      )}
      {children}
    </div>
  );
}

/** Format rupiah ringkas untuk angka besar */
export function idr(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}Rp${Math.abs(Math.round(n)).toLocaleString("id-ID")}`;
}

export function Textarea({
  label,
  hint,
  error,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-muted">
          {label}
        </span>
      )}
      <textarea
        {...props}
        className={`w-full rounded-xl border bg-surface/60 px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent-soft ${
          error ? "border-rose-400" : "border-border"
        } ${className}`}
      />
      {hint && !error && (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  hint,
  error,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-muted">
          {label}
        </span>
      )}
      <select
        {...props}
        className={`w-full cursor-pointer rounded-xl border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition focus:border-accent ${
          error ? "border-rose-400" : "border-border"
        } ${className}`}
      >
        {children}
      </select>
      {hint && !error && (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />
  );
}

export type AuthTabId = "masuk" | "daftar" | "magic";

export function AuthTabs({
  tab,
  onChange,
  disabled,
}: {
  tab: AuthTabId;
  onChange: (t: AuthTabId) => void;
  disabled?: boolean;
}) {
  const tabs: { id: AuthTabId; label: string }[] = [
    { id: "masuk", label: "Masuk" },
    { id: "daftar", label: "Daftar" },
    { id: "magic", label: "Magic Link" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Pilih metode masuk"
      className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface-2 p-1"
    >
      {tabs.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={`rounded-lg px-2 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "bg-accent-strong text-white shadow"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function AuthBanner({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const cls =
    tone === "success"
      ? "border-accent/30 bg-accent-soft text-accent"
      : tone === "error"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
        : tone === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${cls}`}
    >
      {children}
    </div>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
      {message}
    </p>
  );
}

export function PasswordInput({
  label,
  hint,
  error,
  showLabel = "Lihat",
  hideLabel = "Sembunyi",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
  showLabel?: string;
  hideLabel?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-muted">
          {label}
        </span>
      )}
      <span className="relative block">
        <input
          {...props}
          type={show ? "text" : "password"}
          className={`w-full rounded-xl border bg-surface/60 px-4 py-2.5 pr-20 text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent-soft ${
            error ? "border-rose-400" : "border-border"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? hideLabel : showLabel}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          {show ? hideLabel : showLabel}
        </button>
      </span>
      {hint && !error && (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}
