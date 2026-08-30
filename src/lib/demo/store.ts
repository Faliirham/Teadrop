"use client";

import type {
  BalanceUpdate,
  Circle,
  CircleMember,
  Contribution,
  Meetup,
  MeetupRsvp,
  Moment,
  MomentPhoto,
  Period,
  Profile,
} from "@/types/db";

const DB_KEY = "teadrop_demo_db_v1";
const SESSION_KEY = "teadrop_demo_session";
const LOCK_KEY = "teadrop_demo_lock_v1";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
}

export interface DemoDB {
  users: Record<string, DemoUser>;
  profiles: Profile[];
  circles: Circle[];
  members: CircleMember[];
  periods: Period[];
  contributions: Contribution[];
  balances: BalanceUpdate[];
  moments: Moment[];
  moment_photos: MomentPhoto[];
  meetups: Meetup[];
  meetup_rsvps: MeetupRsvp[];
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Placeholder foto demo berupa SVG data-URL kecil (hemat localStorage). */
function svgPhoto(label: string, from: string, to: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<text x="50%" y="50%" font-size="56" fill="rgba(255,255,255,.9)" text-anchor="middle" dominant-baseline="middle">${label}</text>` +
    `</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function buildSeed(): DemoDB {
  const now = new Date().toISOString();

  const me: DemoUser = { id: "u-me", email: "kamu@demo.id", name: "Kamu" };
  const dina: DemoUser = { id: "u-dina", email: "dina@demo.id", name: "Dina" };
  const rizky: DemoUser = { id: "u-rizky", email: "rizky@demo.id", name: "Rizky" };
  const sari: DemoUser = { id: "u-sari", email: "sari@demo.id", name: "Sari" };

  const profiles = [me, dina, rizky, sari].map<Profile>((u) => ({
    id: u.id,
    full_name: u.name,
    avatar_url: null,
    created_at: now,
  }));

  // ---- Circle 1: Squad Teh Tarik (admin = Dina) ----
  const c1 = "c-tehtarik";
  const m1dina: CircleMember = { id: "m-c1-dina", circle_id: c1, user_id: dina.id, role: "admin", joined_at: now };
  const m1rizky: CircleMember = { id: "m-c1-rizky", circle_id: c1, user_id: rizky.id, role: "member", joined_at: now };
  const m1sari: CircleMember = { id: "m-c1-sari", circle_id: c1, user_id: sari.id, role: "member", joined_at: now };
  const m1me: CircleMember = { id: "m-c1-me", circle_id: c1, user_id: me.id, role: "member", joined_at: now };

  // ---- Circle 2: Reuni 2020 (admin = Kamu) ----
  const c2 = "c-reuni20";
  const m2me: CircleMember = { id: "m-c2-me", circle_id: c2, user_id: me.id, role: "admin", joined_at: now };
  const m2rizky: CircleMember = { id: "m-c2-rizky", circle_id: c2, user_id: rizky.id, role: "member", joined_at: now };
  const m2sari: CircleMember = { id: "m-c2-sari", circle_id: c2, user_id: sari.id, role: "member", joined_at: now };

  const pJuli: Period = {
    id: "p-juli",
    circle_id: c1,
    name: "Juli 2026",
    start_date: "2026-07-01",
    due_date: "2026-07-25",
    amount_per_member: 25000,
    is_closed: true,
    created_at: now,
  };
  const pAgs: Period = {
    id: "p-ags",
    circle_id: c1,
    name: "Agustus 2026",
    start_date: "2026-08-01",
    due_date: "2026-08-25",
    amount_per_member: 25000,
    is_closed: false,
    created_at: now,
  };
  const pReuni: Period = {
    id: "p-reuni",
    circle_id: c2,
    name: "Agustus 2026",
    start_date: "2026-08-01",
    due_date: "2026-08-30",
    amount_per_member: 100000,
    is_closed: false,
    created_at: now,
  };

  const contributions: Contribution[] = [
    { id: uid(), period_id: pJuli.id, member_id: m1dina.id, amount: 25000, paid_at: "2026-07-15", method: "transfer", note: null, recorded_by: dina.id, created_at: now },
    { id: uid(), period_id: pJuli.id, member_id: m1rizky.id, amount: 25000, paid_at: "2026-07-16", method: "qris", note: null, recorded_by: dina.id, created_at: now },
    { id: uid(), period_id: pJuli.id, member_id: m1sari.id, amount: 25000, paid_at: "2026-07-18", method: "cash", note: "Dibawa tunai", recorded_by: dina.id, created_at: now },
    { id: uid(), period_id: pJuli.id, member_id: m1me.id, amount: 25000, paid_at: "2026-07-20", method: "transfer", note: null, recorded_by: dina.id, created_at: now },

    { id: uid(), period_id: pAgs.id, member_id: m1sari.id, amount: 25000, paid_at: "2026-08-04", method: "qris", note: "Cepat banget 😄", recorded_by: dina.id, created_at: now },
    { id: uid(), period_id: pAgs.id, member_id: m1rizky.id, amount: 15000, paid_at: "2026-08-09", method: "cash", note: "Bayar sebagian dulu", recorded_by: dina.id, created_at: now },

    { id: uid(), period_id: pReuni.id, member_id: m2me.id, amount: 100000, paid_at: "2026-08-02", method: "transfer", note: null, recorded_by: me.id, created_at: now },
  ];

  const balances: BalanceUpdate[] = [
    { id: uid(), circle_id: c1, previous_amount: 0, new_amount: 500000, note: "Setoran awal ke reksa dana pasar uang (Bibit)", recorded_by: dina.id, created_at: now },
    { id: uid(), circle_id: c1, previous_amount: 500000, new_amount: 1250000, note: "Saldo RDPU terbaru + iuran Juli masuk semua", recorded_by: dina.id, created_at: now },
    { id: uid(), circle_id: c2, previous_amount: 0, new_amount: 300000, note: "DP venue reuni via transfer", recorded_by: me.id, created_at: now },
  ];

  const mNongkrong: Moment = {
    id: "mm-nongkrong",
    circle_id: c1,
    author_id: dina.id,
    content: "Nongkrong Jumat barusan rame banget! Kas-nya juga udah beres semua. ☕✨",
    created_at: now,
  };
  const mSetor: Moment = {
    id: "mm-setor",
    circle_id: c1,
    author_id: rizky.id,
    content: "Setor iuran minggu ini udah gue transfer ya. Cek dashboard!",
    created_at: now,
  };
  const mReuni: Moment = {
    id: "mm-reuni",
    circle_id: c2,
    author_id: me.id,
    content: "Reuni makin dekat, yuk kumpulin sisa target bulan ini! 🎓",
    created_at: now,
  };

  const moments: Moment[] = [mNongkrong, mSetor, mReuni];

  const moment_photos: MomentPhoto[] = [
    { id: uid(), moment_id: mNongkrong.id, url: svgPhoto("🧋", "#10b981", "#0d9488"), storage_path: null, created_at: now },
    { id: uid(), moment_id: mNongkrong.id, url: svgPhoto("🍵", "#14b8a6", "#0f766e"), storage_path: null, created_at: now },
    { id: uid(), moment_id: mReuni.id, url: svgPhoto("🎓", "#6366f1", "#4338ca"), storage_path: null, created_at: now },
  ];

  return {
    users: Object.fromEntries(
      [me, dina, rizky, sari].map((u) => [u.email.toLowerCase(), u])
    ),
    profiles,
    circles: [
      { id: c1, name: "Squad Teh Tarik 🧋", description: "Iuran ngeteh tiap Jumat & kas sosial", invite_code: "TEA7K2P9", default_amount: 25000, created_by: dina.id, deleted_at: null, created_at: now },
      { id: c2, name: "Reuni Angkatan 2020 🎓", description: "Nabung bareng buat acara reuni akhir tahun", invite_code: "REU20X8B", default_amount: 100000, created_by: me.id, deleted_at: null, created_at: now },
    ],
    members: [m1dina, m1rizky, m1sari, m1me, m2me, m2rizky, m2sari],
    periods: [pJuli, pAgs, pReuni],
    contributions,
    balances,
    moments,
    moment_photos,
    meetups: [],
    meetup_rsvps: [],
  };
}

// ---------- persist & reactivity ----------

let cache: DemoDB | null = null;

/** Isi array baru dari seed bila DB lama (versi sebelumnya) belum punya. */
function migrateDB(db: DemoDB): DemoDB {
  const seed = buildSeed();
  if (!Array.isArray(db.moments)) db.moments = seed.moments;
  if (!Array.isArray(db.moment_photos)) db.moment_photos = seed.moment_photos;
  if (!Array.isArray(db.meetups)) db.meetups = seed.meetups;
  if (!Array.isArray(db.meetup_rsvps)) db.meetup_rsvps = seed.meetup_rsvps;
  return db;
}

export function loadDB(): DemoDB {
  if (typeof window === "undefined") throw new Error("Demo store hanya di client");
  if (cache) return cache;
  const raw = window.localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      cache = migrateDB(JSON.parse(raw) as DemoDB);
      return cache;
    } catch {
      /* korup → reseed */
    }
  }
  cache = buildSeed();
  saveDB(cache);
  return cache;
}

export function saveDB(db: DemoDB): void {
  cache = db;
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  emitChange();
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange(): void {
  listeners.forEach((l) => l());
}

/** Berlangganan perubahan data demo (multi-tab via storage event) */
export function subscribeDemo(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DB_KEY) {
      cache = null; // paksa reload dari tab lain
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// ---------- sesi demo ----------

export function getDemoSession(): DemoUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

/** Login demo: email apa pun diterima. Nama diambil dari bagian depan email. */
export function demoSignIn(emailRaw: string): DemoUser {
  const email = emailRaw.trim().toLowerCase() || "kamu@demo.id";
  const db = loadDB();
  let user = db.users[email];
  if (!user) {
    const name = email.split("@")[0].replace(/[._-]+/g, " ");
    user = {
      id: `u-${uid().slice(0, 8)}`,
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
    };
    db.users[email] = user;
    db.profiles.push({ id: user.id, full_name: user.name, avatar_url: null, created_at: new Date().toISOString() });
    saveDB(db);
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function demoSignOut(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

// ---------- guard anti double-seed lintas deploy ----------
export function checkVersionLock(): void {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(LOCK_KEY)) {
    window.localStorage.setItem(LOCK_KEY, "1");
  }
}
