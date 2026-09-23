"use client";

import { isDemoMode } from "./env";
import {
  loadDB,
  saveDB,
  getDemoSession,
  demoSignIn,
  demoSignOut,
  uid,
} from "./demo/store";
import type { DemoUser } from "./demo/store";
import { createClient } from "@/lib/supabase/client";
import { uploadPhoto } from "./storage";
import type {
  BalanceUpdate,
  Circle,
  CircleMember,
  Contribution,
  Meetup,
  MeetupRsvp,
  MeetupStatus,
  Moment,
  MomentPhoto,
  MomentWithPhotos,
  Period,
  Profile,
  Role,
} from "@/types/db";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/** Normalisasi email untuk validasi client (tidak mengubah logika network). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validasi email sederhana di client sebelum memanggil Supabase. */
export function validateEmail(email: string): string | null {
  const v = normalizeEmail(email);
  if (!v) return "Isi email dulu ya.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Format email belum valid. Contoh: kamu@email.com";
  return null;
}

/** Validasi password di client (Supabase minimum 6 karakter). */
export function validatePassword(password: string): string | null {
  if (!password) return "Isi password dulu ya.";
  if (password.length < 6) return "Password minimal 6 karakter ya.";
  return null;
}

function makeInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ============================================================
// SESSION
// ============================================================

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode) {
    const u = getDemoSession() as DemoUser | null;
    return u ? { id: u.id, email: u.email, name: u.name } : null;
  }
  const sb = createClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Sahabat",
  };
}

/** Login dengan email(+password di mode live). Demo: email apa pun diterima. */
export async function signIn(email: string, password: string): Promise<void> {
  if (isDemoMode) {
    demoSignIn(email);
    return;
  }
  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) return;
  // Jika user belum ada, daftarkan otomatis (sesuai janji di halaman login).
  // Typo password pada email yang sudah terdaftar tetap ditolak Supabase
  // dengan pesan yang sama, jadi akun sampah tidak dibuat dalam kasus itu.
  if (/invalid login credentials/i.test(error.message)) {
    await signUp(email, password);
    return;
  }
  throw new Error(error.message);
}

/**
 * Daftar akun baru (hanya mode live). Melempar EMAIL_CONFIRM_REQUIRED bila
 * project mewajibkan konfirmasi email — user harus klik link di inbox dulu.
 */
export async function signUp(email: string, password: string): Promise<void> {
  if (isDemoMode) {
    demoSignIn(email);
    return;
  }
  const sb = createClient();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    // Balapan: akun ternyata sudah ada (dibuat via magic link dsb) → coba login.
    if (/already registered|already exists/i.test(error.message)) {
      const retry = await sb.auth.signInWithPassword({ email, password });
      if (retry.error) throw new Error(retry.error.message);
      return;
    }
    throw new Error(error.message);
  }
  if (data.session) return;
  throw new Error("EMAIL_CONFIRM_REQUIRED");
}

/** Kirim magic link (hanya mode live; di demo langsung login) */
export async function sendMagicLink(
  email: string,
  redirectBase: string,
  next?: string
): Promise<void> {
  if (isDemoMode) {
    demoSignIn(email);
    return;
  }
  const sb = createClient();
  const redirect =
    `${redirectBase}/auth/callback` +
    (next ? `?next=${encodeURIComponent(next)}` : "");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect },
  });
  if (error) throw new Error(error.message);
}

/** Akses Google OAuth (hanya mode live; di demo langsung login). */
export async function signInWithGoogle(
  redirectBase: string,
  next?: string
): Promise<void> {
  if (isDemoMode) {
    demoSignIn("kamu@demo.id");
    return;
  }
  const sb = createClient();
  const redirect =
    `${redirectBase}/auth/callback` +
    (next ? `?next=${encodeURIComponent(next)}` : "");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirect },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  if (isDemoMode) {
    demoSignOut();
    return;
  }
  const sb = createClient();
  await sb.auth.signOut();
}

// ============================================================
// CIRCLES
// ============================================================

export interface MyCircle extends Circle {
  role: Role;
  memberCount: number;
}

export interface CircleDetail {
  circle: Circle;
  members: (CircleMember & { profile?: Profile })[];
  periods: Period[];
  contributions: Contribution[];
  balances: BalanceUpdate[];
  latestBalance: BalanceUpdate | null;
  myRole: Role | null;
}

export async function listMyCircles(): Promise<MyCircle[]> {
  const session = await getSessionUser();
  if (!session) return [];

  if (isDemoMode) {
    const db = loadDB();
    const mine = db.members.filter((m) => m.user_id === session.id);
    return mine
      .map((m) => {
        const circle = db.circles.find((c) => c.id === m.circle_id && !c.deleted_at);
        if (!circle) return null;
        return {
          ...circle,
          role: m.role,
          memberCount: db.members.filter((x) => x.circle_id === circle.id).length,
        };
      })
      .filter((x): x is MyCircle => x !== null);
  }

  const sb = createClient();
  const { data, error } = await sb
    .from("circle_members")
    .select(
      "role, circle:circles(id, name, description, invite_code, default_amount, created_by, deleted_at, created_at)"
    )
    .eq("user_id", session.id);
  if (error) throw new Error(error.message);

  type JoinedRow = { role: Role; circle: Circle | null };
  const rows = ((data ?? []) as unknown as JoinedRow[]).filter(
    (r) => r.circle && !r.circle.deleted_at
  );

  // Hitung total anggota per circle dalam SATU query (hindari N+1).
  const circleIds = rows.map((r) => r.circle!.id);
  let counts: Record<string, number> = {};
  if (circleIds.length) {
    const { data: memberships, error: e2 } = await sb
      .from("circle_members")
      .select("circle_id")
      .in("circle_id", circleIds);
    if (e2) throw new Error(e2.message);
    counts = ((memberships ?? []) as { circle_id: string }[]).reduce(
      (acc, m) => {
        acc[m.circle_id] = (acc[m.circle_id] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  return rows.map((r) => ({
    ...r.circle!,
    role: r.role,
    memberCount: counts[r.circle!.id] ?? 0,
  }));
}

export async function createCircle(input: {
  name: string;
  description?: string;
  defaultAmount: number;
}): Promise<string> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");

  if (isDemoMode) {
    const db = loadDB();
    const now = new Date().toISOString();
    const circle: Circle = {
      id: uid(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      invite_code: makeInviteCode(),
      default_amount: input.defaultAmount,
      created_by: session.id,
      deleted_at: null,
      created_at: now,
    };
    db.circles.push(circle);
    db.members.push({
      id: uid(),
      circle_id: circle.id,
      user_id: session.id,
      role: "admin",
      joined_at: now,
    });
    saveDB(db);
    return circle.id;
  }

  const sb = createClient();
  const { data, error } = await sb
    .from("circles")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      default_amount: input.defaultAmount,
      created_by: session.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function updateCircle(
  circleId: string,
  input: { name: string; description?: string }
): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");

  if (isDemoMode) {
    const db = loadDB();
    const circle = db.circles.find((c) => c.id === circleId);
    if (!circle) throw new Error("Circle tidak ditemukan");
    circle.name = input.name.trim();
    circle.description = input.description?.trim() || null;
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { error } = await sb
    .from("circles")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .eq("id", circleId);
  if (error) throw new Error(error.message);
}

export async function joinCircle(codeRaw: string): Promise<string> {
  const code = codeRaw.trim().toUpperCase();

  if (isDemoMode) {
    const session = await getSessionUser();
    if (!session) throw new Error("Belum login");
    const db = loadDB();
    const circle = db.circles.find(
      (c) => c.invite_code.toUpperCase() === code && !c.deleted_at
    );
    if (!circle) throw new Error("Kode undangan tidak valid.");
    if (db.members.some((m) => m.circle_id === circle.id && m.user_id === session.id))
      throw new Error("Kamu sudah jadi anggota circle ini.");
    db.members.push({
      id: uid(),
      circle_id: circle.id,
      user_id: session.id,
      role: "member",
      joined_at: new Date().toISOString(),
    });
    saveDB(db);
    return circle.id;
  }

  const sb = createClient();
  const { data, error } = await sb.rpc("join_circle", { p_code: code });
  if (error) {
    const msg =
      error.message === "KODE_TIDAK_VALID"
        ? "Kode undangan tidak valid."
        : error.message;
    throw new Error(msg);
  }
  return data as string;
}

export async function getCircleDetail(id: string): Promise<CircleDetail> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");

  if (isDemoMode) {
    const db = loadDB();
    const circle = db.circles.find((c) => c.id === id && !c.deleted_at);
    if (!circle) throw new Error("Circle tidak ditemukan.");
    const members = db.members
      .filter((m) => m.circle_id === id)
      .map((m) => ({ ...m, profile: db.profiles.find((p) => p.id === m.user_id) }));
    const periods = db.periods
      .filter((p) => p.circle_id === id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const contributions = db.contributions.filter((c) =>
      periods.some((p) => p.id === c.period_id)
    );
    const balances = db.balances
      .filter((b) => b.circle_id === id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const me = members.find((m) => m.user_id === session.id);
    return {
      circle,
      members,
      periods,
      contributions,
      balances,
      latestBalance: balances[0] ?? null,
      myRole: me?.role ?? null,
    };
  }

  const sb = createClient();
  const { data: circle, error: e1 } = await sb
    .from("circles")
    .select(
      "id, name, description, invite_code, default_amount, created_by, deleted_at, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (e1) throw new Error(e1.message);
  if (!circle || circle.deleted_at) throw new Error("Circle tidak ditemukan.");

  const [{ data: members, error: e2 }, { data: periods, error: e3 }, { data: balances, error: e5 }] =
    await Promise.all([
      sb.from("circle_members").select("*, profile:profiles(*)").eq("circle_id", id),
      sb.from("periods").select("*").eq("circle_id", id).order("created_at", { ascending: false }),
      sb.from("balance_updates").select("*").eq("circle_id", id).order("created_at", { ascending: false }),
    ]);
  if (e2) throw new Error(e2.message);
  if (e3) throw new Error(e3.message);
  if (e5) throw new Error(e5.message);

  const periodList = (periods ?? []) as Period[];
  const periodIds = periodList.map((p) => p.id);

  let contributions: Contribution[] = [];
  if (periodIds.length) {
    const { data: cons, error: e4 } = await sb
      .from("contributions")
      .select("*")
      .in("period_id", periodIds)
      .order("paid_at", { ascending: false });
    if (e4) throw new Error(e4.message);
    contributions = (cons ?? []) as Contribution[];
  }

  const me = (members ?? []).find((m) => m.user_id === session.id);
  return {
    circle: circle as Circle,
    members: (members ?? []) as (CircleMember & { profile?: Profile })[],
    periods: periodList,
    contributions,
    balances: (balances ?? []) as BalanceUpdate[],
    latestBalance: ((balances ?? []) as BalanceUpdate[])[0] ?? null,
    myRole: (me?.role as Role) ?? null,
  };
}

export async function regenerateInvite(circleId: string): Promise<string> {
  const code = makeInviteCode();
  if (isDemoMode) {
    const db = loadDB();
    const c = db.circles.find((x) => x.id === circleId);
    if (c) c.invite_code = code;
    saveDB(db);
    return code;
  }
  const sb = createClient();
  const { error } = await sb
    .from("circles")
    .update({ invite_code: code })
    .eq("id", circleId);
  if (error) throw new Error(error.message);
  return code;
}

// ============================================================
// SHAREABLE READ-ONLY LINKS (Fase 4)
// ============================================================

export interface PublicCircle {
  id: string;
  name: string;
  description: string | null;
  default_amount: number;
  created_at: string;
  latest_balance: { new_amount: number; created_at: string } | null;
  members: { id: string; role: Role; full_name: string | null }[];
  active_period: {
    id: string;
    name: string;
    due_date: string;
    amount_per_member: number;
    collected: number;
  } | null;
  moments: {
    id: string;
    content: string;
    created_at: string;
    author_name: string | null;
    photos: { url: string }[];
  }[];
  meetups: {
    id: string;
    title: string;
    location: string | null;
    start_at: string;
    created_by_name: string | null;
    rsvp_going: number;
    rsvp_maybe: number;
    rsvp_declined: number;
  }[];
}

/** Membaca snapshot circle tanpa login (via token di URL). Anon aman. */
export async function getCirclePublic(token: string): Promise<PublicCircle | null> {
  if (isDemoMode) {
    // Mode demo: token adalah id circle, kembalikan data setara dari store.
    const db = loadDB();
    const circle = db.circles.find((c) => c.id === token && !c.deleted_at);
    if (!circle) return null;
    const members = db.members
      .filter((m) => m.circle_id === circle.id)
      .map((m) => {
        const p = db.profiles.find((x) => x.id === m.user_id);
        return { id: m.id, role: m.role, full_name: p?.full_name ?? null };
      });
    const periods = db.periods
      .filter((p) => p.circle_id === circle.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const active = periods.find((p) => !p.is_closed) ?? null;
    const latest = db.balances
      .filter((b) => b.circle_id === circle.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    return {
      id: circle.id,
      name: circle.name,
      description: circle.description,
      default_amount: circle.default_amount,
      created_at: circle.created_at,
      latest_balance: latest
        ? { new_amount: Number(latest.new_amount), created_at: latest.created_at }
        : null,
      members,
      active_period: active
        ? {
            id: active.id,
            name: active.name,
            due_date: active.due_date,
            amount_per_member: Number(active.amount_per_member),
            collected: db.contributions
              .filter((c) => c.period_id === active.id)
              .reduce((s, c) => s + Number(c.amount), 0),
          }
        : null,
      moments: db.moments
        .filter((m) => m.circle_id === circle.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 10)
        .map((m) => ({
          id: m.id,
          content: m.content,
          created_at: m.created_at,
          author_name: db.profiles.find((p) => p.id === m.author_id)?.full_name ?? null,
          photos: db.moment_photos.filter((ph) => ph.moment_id === m.id).map((ph) => ({ url: ph.url })),
        })),
      meetups: db.meetups
        .filter((m) => m.circle_id === circle.id)
        .sort((a, b) => (a.start_at < b.start_at ? -1 : 1))
        .slice(0, 5)
        .map((m) => {
          const rsvps = db.meetup_rsvps.filter((r) => r.meetup_id === m.id);
          return {
            id: m.id,
            title: m.title,
            location: m.location,
            start_at: m.start_at,
            created_by_name: db.profiles.find((p) => p.id === m.created_by)?.full_name ?? null,
            rsvp_going: rsvps.filter((r) => r.status === "going").length,
            rsvp_maybe: rsvps.filter((r) => r.status === "maybe").length,
            rsvp_declined: rsvps.filter((r) => r.status === "declined").length,
          };
        }),
    };
  }

  const sb = createClient();
  const { data, error } = await sb.rpc("get_circle_public", { p_token: token });
  if (error) throw new Error(error.message);
  return (data ?? null) as PublicCircle | null;
}

/** Ambil read_token circle (dipakai tombol "Salin link lihat"). Hanya admin. */
export async function getCircleReadToken(circleId: string): Promise<string> {
  if (isDemoMode) {
    // Demo tidak punya token terpisah — pakai id circle sebagai token.
    return circleId;
  }
  const sb = createClient();
  const { data, error } = await sb.rpc("get_read_token", {
    p_circle_id: circleId,
  });
  if (error) throw new Error(error.message);
  const token = data as string;
  if (!token) throw new Error("Circle belum punya link lihat.");
  return token;
}

/** Rotasi (ganti) read_token — khusus admin. */
export async function rotateReadToken(circleId: string): Promise<string> {
  if (isDemoMode) {
    return circleId;
  }
  const sb = createClient();
  const { data, error } = await sb.rpc("rotate_read_token", {
    p_circle_id: circleId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setMemberRole(memberId: string, role: Role): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    const m = db.members.find((x) => x.id === memberId);
    if (m) m.role = role;
    saveDB(db);
    return;
  }
  const sb = createClient();
  const { error } = await sb.from("circle_members").update({ role }).eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function removeMember(memberId: string): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    db.members = db.members.filter((m) => m.id !== memberId);
    saveDB(db);
    return;
  }
  const sb = createClient();
  const { error } = await sb.from("circle_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function leaveCircle(circleId: string): Promise<void> {
  const session = await getSessionUser();
  if (!session) return;
  if (isDemoMode) {
    const db = loadDB();
    db.members = db.members.filter(
      (m) => !(m.circle_id === circleId && m.user_id === session.id && m.role === "member")
    );
    saveDB(db);
    return;
  }
  const sb = createClient();
  const { error } = await sb
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", session.id)
    .eq("role", "member");
  if (error) throw new Error(error.message);
}

export async function deleteCircleSoft(circleId: string): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    const c = db.circles.find((x) => x.id === circleId);
    if (c) c.deleted_at = new Date().toISOString();
    saveDB(db);
    return;
  }
  const sb = createClient();
  const { error } = await sb
    .from("circles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", circleId);
  if (error) throw new Error(error.message);
}

// ============================================================
// PERIODS
// ============================================================

export async function addPeriod(input: {
  circleId: string;
  name: string;
  dueDate: string; // yyyy-mm-dd
  amountPerMember: number;
}): Promise<string> {
  if (isDemoMode) {
    const db = loadDB();
    const existingActive = db.periods.find(
      (p) => p.circle_id === input.circleId && !p.is_closed
    );
    if (existingActive)
      throw new Error("Masih ada periode aktif. Tutup dulu periode sebelumnya.");
    const period: Period = {
      id: uid(),
      circle_id: input.circleId,
      name: input.name.trim(),
      start_date: new Date().toISOString().slice(0, 10),
      due_date: input.dueDate,
      amount_per_member: input.amountPerMember,
      is_closed: false,
      created_at: new Date().toISOString(),
    };
    db.periods.push(period);
    saveDB(db);
    return period.id;
  }

  const sb = createClient();
  const { data, error } = await sb
    .from("periods")
    .insert({
      circle_id: input.circleId,
      name: input.name.trim(),
      start_date: new Date().toISOString().slice(0, 10),
      due_date: input.dueDate,
      amount_per_member: input.amountPerMember,
      is_closed: false,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(
      error.code === "23505"
        ? "Nama periode sudah dipakai / masih ada periode aktif."
        : error.message
    );
  }
  return (data as { id: string }).id;
}

export async function closePeriod(periodId: string): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    const p = db.periods.find((x) => x.id === periodId);
    if (p) p.is_closed = true;
    saveDB(db);
    return;
  }
  const sb = createClient();
  const { error } = await sb
    .from("periods")
    .update({ is_closed: true })
    .eq("id", periodId);
  if (error) throw new Error(error.message);
}

// ============================================================
// CONTRIBUTIONS
// ============================================================

export async function addContribution(input: {
  periodId: string;
  memberId: string;
  amount: number;
  method: Contribution["method"];
  note?: string | null;
}): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");

  if (isDemoMode) {
    const db = loadDB();
    const period = db.periods.find((p) => p.id === input.periodId);
    if (!period) throw new Error("Periode tidak ditemukan.");
    if (period.is_closed) throw new Error("Periode sudah ditutup.");
    db.contributions.push({
      id: uid(),
      period_id: input.periodId,
      member_id: input.memberId,
      amount: input.amount,
      paid_at: new Date().toISOString().slice(0, 10),
      method: input.method,
      note: input.note?.trim() || null,
      recorded_by: session.id,
      created_at: new Date().toISOString(),
    });
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { error } = await sb.from("contributions").insert({
    period_id: input.periodId,
    member_id: input.memberId,
    amount: input.amount,
    paid_at: new Date().toISOString().slice(0, 10),
    method: input.method,
    note: input.note?.trim() || null,
    recorded_by: session.id,
  });
  if (error) throw new Error(error.message);
}

export async function deleteContribution(contributionId: string): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    db.contributions = db.contributions.filter((c) => c.id !== contributionId);
    saveDB(db);
    return;
  }
  const sb = createClient();
  const { error } = await sb.from("contributions").delete().eq("id", contributionId);
  if (error) throw new Error(error.message);
}

// ============================================================
// MOMENTS (diary kegiatan circle)
// ============================================================

export async function listMoments(circleId: string): Promise<MomentWithPhotos[]> {
  const session = await getSessionUser();
  if (!session) return [];

  if (isDemoMode) {
    const db = loadDB();
    return db.moments
      .filter((m) => m.circle_id === circleId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((m) => ({
        ...m,
        author_name:
          db.profiles.find((p) => p.id === m.author_id)?.full_name ?? "Anggota",
        photos: db.moment_photos
          .filter((ph) => ph.moment_id === m.id)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
      }));
  }

  const sb = createClient();
  const { data, error } = await sb
    .from("moments")
    .select("*, author:profiles(full_name)")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  type MomentRow = Moment & { author: { full_name: string | null } | null };
  const rows = (data ?? []) as unknown as MomentRow[];
  const ids = rows.map((r) => r.id);

  const { data: photos, error: e2 } = ids.length
    ? await sb
        .from("moment_photos")
        .select("*")
        .in("moment_id", ids)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (e2) throw new Error(e2.message);

  const photoList = (photos ?? []) as MomentPhoto[];
  return rows.map((r) => ({
    ...r,
    author_name: r.author?.full_name ?? "Anggota",
    photos: photoList.filter((p) => p.moment_id === r.id),
  }));
}

export async function addMoment(input: {
  circleId: string;
  content: string;
  files: File[];
}): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");

  const momentId = uid();

  if (isDemoMode) {
    const db = loadDB();
    db.moments.push({
      id: momentId,
      circle_id: input.circleId,
      author_id: session.id,
      content: input.content.trim(),
      created_at: new Date().toISOString(),
    });
    for (const file of input.files) {
      const { url } = await uploadPhoto(file, input.circleId, momentId);
      db.moment_photos.push({
        id: uid(),
        moment_id: momentId,
        url,
        storage_path: null,
        created_at: new Date().toISOString(),
      });
    }
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { error } = await sb.from("moments").insert({
    id: momentId,
    circle_id: input.circleId,
    author_id: session.id,
    content: input.content.trim(),
  });
  if (error) throw new Error(error.message);

  for (const file of input.files) {
    const { url, path } = await uploadPhoto(file, input.circleId, momentId);
    const { error: pe } = await sb
      .from("moment_photos")
      .insert({ moment_id: momentId, url, storage_path: path });
    if (pe) throw new Error(pe.message);
  }
}

export async function deleteMoment(momentId: string): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    db.moment_photos = db.moment_photos.filter((p) => p.moment_id !== momentId);
    db.moments = db.moments.filter((m) => m.id !== momentId);
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { data: photos } = await sb
    .from("moment_photos")
    .select("storage_path")
    .eq("moment_id", momentId);
  const { error } = await sb.from("moments").delete().eq("id", momentId);
  if (error) throw new Error(error.message);

  const paths = ((photos ?? []) as { storage_path: string | null }[])
    .map((p) => p.storage_path)
    .filter((p): p is string => !!p);
  if (paths.length) await sb.storage.from("circle-photos").remove(paths);
}

// ============================================================
// MEETUPS (kalender acara + RSVP)
// ============================================================

export interface MeetupWithRsvp extends Meetup {
  created_by_name?: string;
  rsvps: MeetupRsvp[];
}

export async function listMeetups(circleId: string): Promise<MeetupWithRsvp[]> {
  const session = await getSessionUser();
  if (!session) return [];

  if (isDemoMode) {
    const db = loadDB();
    return db.meetups
      .filter((m) => m.circle_id === circleId)
      .sort((a, b) => (a.start_at < b.start_at ? -1 : 1))
      .map((m) => ({
        ...m,
        created_by_name:
          db.profiles.find((p) => p.id === m.created_by)?.full_name ?? "Anggota",
        rsvps: db.meetup_rsvps.filter((r) => r.meetup_id === m.id),
      }));
  }

  const sb = createClient();
  const { data, error } = await sb
    .from("meetups")
    .select("*, creator:profiles(full_name)")
    .eq("circle_id", circleId)
    .order("start_at", { ascending: true });
  if (error) throw new Error(error.message);

  type MeetupRow = Meetup & { creator: { full_name: string | null } | null };
  const rows = (data ?? []) as unknown as MeetupRow[];
  const ids = rows.map((r) => r.id);

  const { data: rsvps, error: e2 } = ids.length
    ? await sb.from("meetup_rsvps").select("*").in("meetup_id", ids)
    : { data: [], error: null };
  if (e2) throw new Error(e2.message);

  const rsvpList = (rsvps ?? []) as MeetupRsvp[];
  return rows.map((r) => ({
    ...r,
    created_by_name: r.creator?.full_name ?? "Anggota",
    rsvps: rsvpList.filter((x) => x.meetup_id === r.id),
  }));
}

export async function createMeetup(input: {
  circleId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
}): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");

  if (isDemoMode) {
    const db = loadDB();
    db.meetups.push({
      id: uid(),
      circle_id: input.circleId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      start_at: input.startAt,
      created_by: session.id,
      created_at: new Date().toISOString(),
    });
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { error } = await sb.from("meetups").insert({
    circle_id: input.circleId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    start_at: input.startAt,
    created_by: session.id,
  });
  if (error) throw new Error(error.message);
}

export async function rsvpMeetup(
  meetupId: string,
  memberId: string,
  status: MeetupStatus
): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    const existing = db.meetup_rsvps.find(
      (r) => r.meetup_id === meetupId && r.member_id === memberId
    );
    if (existing) existing.status = status;
    else
      db.meetup_rsvps.push({
        id: uid(),
        meetup_id: meetupId,
        member_id: memberId,
        status,
        created_at: new Date().toISOString(),
      });
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { error } = await sb
    .from("meetup_rsvps")
    .upsert(
      { meetup_id: meetupId, member_id: memberId, status },
      { onConflict: "meetup_id,member_id" }
    );
  if (error) throw new Error(error.message);
}

export async function deleteMeetup(meetupId: string): Promise<void> {
  if (isDemoMode) {
    const db = loadDB();
    db.meetup_rsvps = db.meetup_rsvps.filter((r) => r.meetup_id !== meetupId);
    db.meetups = db.meetups.filter((m) => m.id !== meetupId);
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { error } = await sb.from("meetups").delete().eq("id", meetupId);
  if (error) throw new Error(error.message);
}

// ============================================================
// PROFILE
// ============================================================

export async function updateProfile(input: {
  fullName: string;
  avatarFile?: File | null;
}): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");

  let avatarUrl: string | null = null;

  if (isDemoMode) {
    const db = loadDB();
    const profile = db.profiles.find((p) => p.id === session.id);
    if (profile) {
      profile.full_name = input.fullName.trim() || null;
      if (input.avatarFile) {
        const { compressImage } = await import("./image");
        avatarUrl = await compressImage(input.avatarFile);
        profile.avatar_url = avatarUrl;
      }
      saveDB(db);
    }
    return;
  }

  const sb = createClient();

  if (input.avatarFile) {
    const ext = input.avatarFile.type === "image/png" ? "png" : "jpg";
    const path = `avatars/${session.id}/${Date.now()}.${ext}`;
    const dataUrl = await (await import("./image")).compressImage(input.avatarFile);
    const blob = await (await fetch(dataUrl)).blob();

    const { error: uploadErr } = await sb.storage
      .from("circle-photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: urlData } = sb.storage.from("circle-photos").getPublicUrl(path);
    avatarUrl = urlData.publicUrl;
  }

  const update: Record<string, unknown> = {
    full_name: input.fullName.trim() || null,
  };
  if (avatarUrl) update.avatar_url = avatarUrl;

  const { error } = await sb
    .from("profiles")
    .update(update)
    .eq("id", session.id);
  if (error) throw new Error(error.message);

  // Also update auth metadata so session reflects new name
  await sb.auth.updateUser({ data: { full_name: input.fullName.trim() } });
}

// ============================================================
// BALANCE (manual, immutable audit trail)
// ============================================================

export async function updateBalance(
  circleId: string,
  newAmount: number,
  note: string
): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("Belum login");
  if (!note.trim()) throw new Error("Catatan perubahan saldo wajib diisi.");

  if (isDemoMode) {
    const db = loadDB();
    const prev = db.balances
      .filter((b) => b.circle_id === circleId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    db.balances.push({
      id: uid(),
      circle_id: circleId,
      previous_amount: prev?.new_amount ?? 0,
      new_amount: newAmount,
      note: note.trim(),
      recorded_by: session.id,
      created_at: new Date().toISOString(),
    });
    saveDB(db);
    return;
  }

  const sb = createClient();
  const { data: prev } = await sb
    .from("balance_updates")
    .select("new_amount")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false })
    .limit(1);
  const { error } = await sb.from("balance_updates").insert({
    circle_id: circleId,
    previous_amount: prev?.[0]?.new_amount ?? 0,
    new_amount: newAmount,
    note: note.trim(),
    recorded_by: session.id,
  });
  if (error) throw new Error(error.message);
}
