"use client";

import { useRef, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { MomentWithPhotos } from "@/types/db";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({ name }: { name?: string }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">
      {initial}
    </span>
  );
}

const MAX_PHOTOS = 4;

export function DiaryComposer({
  onPost,
}: {
  onPost: (content: string, files: File[]) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const room = MAX_PHOTOS - files.length;
    const next = Array.from(list).slice(0, room);
    setFiles((prev) => [...prev, ...next]);
    setPreviews((prev) => [...prev, ...next.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, x) => x !== i));
    setPreviews((prev) => prev.filter((_, x) => x !== i));
  };

  const submit = async () => {
    if (!content.trim() && files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      await onPost(content.trim(), files);
      setContent("");
      setFiles([]);
      setPreviews([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memposting momen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ceritakan momen circle kalian…"
        maxLength={500}
        rows={2}
        className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />

      {previews.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`preview ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[10px] text-white"
                title="hapus"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_PHOTOS}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-foreground disabled:text-muted/40"
        >
          <CameraIcon /> Foto {files.length > 0 && `(${files.length}/${MAX_PHOTOS})`}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          loading={busy}
          disabled={(!content.trim() && files.length === 0) || busy}
          onClick={submit}
        >
          Posting
        </Button>
      </div>

      {err && (
        <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>
      )}
    </Card>
  );
}

export function DiaryFeed({
  moments,
  currentUserId,
  isAdmin,
  onDelete,
}: {
  moments: MomentWithPhotos[];
  currentUserId?: string;
  isAdmin: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  if (moments.length === 0) {
    return (
      <EmptyState
        icon={<DiaryIcon />}
        title="Belum ada momen"
        desc="Jadikan diary bersama — catat kegiatan, upload foto, kenang bareng."
      />
    );
  }

  return (
    <div className="space-y-3">
      {moments.map((m) => {
        const canDelete = isAdmin || m.author_id === currentUserId;
        return (
          <Card key={m.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={m.author_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.author_name ?? "Anggota"}
                </p>
                <p className="text-xs text-muted">{fmtDateTime(m.created_at)}</p>
              </div>
              {canDelete && (
                <button
                  onClick={() => onDelete(m.id)}
                  className="text-xs text-muted/50 transition hover:text-rose-400"
                  title="hapus"
                >
                  hapus
                </button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{m.content}</p>
            {m.photos.length > 0 && (
              <div
                className="mt-2 grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(m.photos.length, 3)}, minmax(0, 1fr))`,
                }}
              >
                {m.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.url}
                    alt="foto momen"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function DiaryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-muted">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
