"use client";

import { useState } from "react";
import { Button, EmptyState, Input, Modal } from "@/components/ui";
import type { MeetupWithRsvp } from "@/lib/api";
import type { MeetupStatus } from "@/types/db";

type Props = {
  meetups: MeetupWithRsvp[];
  currentUserId: string;
  isAdmin: boolean;
  onCreate: (input: {
    title: string;
    description: string;
    location: string;
    startAt: string;
  }) => Promise<void>;
  onRsvp: (meetupId: string, status: MeetupStatus) => Promise<void>;
  onDelete: (meetupId: string) => Promise<void>;
};

const RSVP_LABEL: Record<MeetupStatus, string> = {
  going: "Hadir",
  maybe: "Mungkin",
  declined: "Tidak Hadir",
};

const RSVP_TONE: Record<MeetupStatus, string> = {
  going: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  maybe: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  declined: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function MeetupCalendar({
  meetups,
  currentUserId,
  isAdmin,
  onCreate,
  onRsvp,
  onDelete,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const upcoming = meetups.filter((m) => !isPast(m.start_at));
  const past = meetups.filter((m) => isPast(m.start_at));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Kalender Meetup ({meetups.length})
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          + Buat Acara
        </Button>
      </div>

      {meetups.length === 0 && (
        <EmptyState
          title="Belum ada meetup"
          desc="Buat acara pertama untuk ngumpul bareng circle."
        />
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map((m) => (
            <MeetupCard
              key={m.id}
              meetup={m}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRsvp={onRsvp}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Riwayat
          </p>
          {past.map((m) => (
            <MeetupCard
              key={m.id}
              meetup={m}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRsvp={onRsvp}
              onDelete={onDelete}
              past
            />
          ))}
        </div>
      )}

      <CreateMeetupModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (data) => {
          await onCreate(data);
          setShowCreate(false);
        }}
      />
    </div>
  );
}

function MeetupCard({
  meetup,
  currentUserId,
  isAdmin,
  onRsvp,
  onDelete,
  past = false,
}: {
  meetup: MeetupWithRsvp;
  currentUserId: string;
  isAdmin: boolean;
  onRsvp: (meetupId: string, status: MeetupStatus) => Promise<void>;
  onDelete: (meetupId: string) => Promise<void>;
  past?: boolean;
}) {
  const myRsvp = meetup.rsvps.find((r) => r.member_id === currentUserId);
  const going = meetup.rsvps.filter((r) => r.status === "going");
  const maybe = meetup.rsvps.filter((r) => r.status === "maybe");
  const declined = meetup.rsvps.filter((r) => r.status === "declined");

  return (
    <div
      className={`glass rounded-2xl p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)] ${
        past ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-foreground">{meetup.title}</h4>
          <p className="mt-0.5 text-sm text-muted">
            {fmtDateTime(meetup.start_at)}
          </p>
          {meetup.location && (
            <p className="mt-1 text-sm text-muted">
              <span className="mr-1 inline-block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline h-3.5 w-3.5 -mt-0.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              {meetup.location}
            </p>
          )}
          {meetup.description && (
            <p className="mt-2 text-sm text-muted/80">{meetup.description}</p>
          )}
          {meetup.created_by_name && (
            <p className="mt-2 text-xs text-muted/60">
              Dibuat oleh {meetup.created_by_name}
            </p>
          )}
        </div>

        {isAdmin && !past && (
          <button
            type="button"
            onClick={() => onDelete(meetup.id)}
            className="shrink-0 rounded-lg p-1.5 text-muted/60 transition hover:bg-rose-500/10 hover:text-rose-400"
            title="Hapus acara"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>

      {/* RSVP summary */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        {going.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {going.length} hadir
          </span>
        )}
        {maybe.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {maybe.length} mungkin
          </span>
        )}
        {declined.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            {declined.length} tidak hadir
          </span>
        )}
      </div>

      {/* RSVP buttons */}
      {!past && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(["going", "maybe", "declined"] as MeetupStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onRsvp(meetup.id, s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
                myRsvp?.status === s
                  ? RSVP_TONE[s]
                  : "bg-surface/60 text-muted ring-border hover:bg-surface-2"
              }`}
            >
              {RSVP_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateMeetupModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    location: string;
    startAt: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startAt) return;
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startAt: new Date(startAt).toISOString(),
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setStartAt("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Meetup Baru">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Judul Acara"
          required
          placeholder="Ngopi bareng, Rapat bulanan, dll."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Lokasi"
          placeholder="Cafe ABC, Zoom, dll."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Input
          label="Waktu"
          type="datetime-local"
          required
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
        <Input
          label="Deskripsi (opsional)"
          placeholder="Catatan tambahan untuk anggota..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button type="submit" loading={busy} className="flex-1">
            Buat Acara
          </Button>
        </div>
      </form>
    </Modal>
  );
}
