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
  if (error) throw new Error(error.message);
}

/** Kirim magic link (hanya mode live; di demo langsung login) */
export async function sendMagicLink(
  email: string,
  redirectBase: string
): Promise<void> {
  if (isDemoMode) {
    demoSignIn(email);
    return;
  }
  const sb = createClient();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${redirectBase}/auth/callback` },
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
    .select("role, circle:circles(*)")
    .eq("user_id", session.id);
  if (error) throw new Error(error.message);

  type JoinedRow = { role: Role; circle: Circle | null };
  const rows = ((data ?? []) as unknown as JoinedRow[]).filter(
    (r) => r.circle && !r.circle.deleted_at
  );
  const counts = await Promise.all(
    rows.map(async (r) => {
      const { count } = await sb
        .from("circle_members")
        .select("*", { count: "exact", head: true })
        .eq("circle_id", r.circle!.id);
      return count ?? 0;
    })
  );
  return rows.map((r, i) => ({
    ...r.circle!,
    role: r.role,
    memberCount: counts[i],
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
      invite_code: makeInviteCode(),
      default_amount: input.defaultAmount,
      created_by: session.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
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
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw new Error(e1.message);
  if (!circle || circle.deleted_at) throw new Error("Circle tidak ditemukan.");

  const [{ data: members, error: e2 }, { data: periods, error: e3 }, { data: contributions, error: e4 }, { data: balances, error: e5 }] =
    await Promise.all([
      sb.from("circle_members").select("*, profile:profiles(*)").eq("circle_id", id),
      sb.from("periods").select("*").eq("circle_id", id).order("created_at", { ascending: false }),
      sb.from("contributions").select("*").order("paid_at", { ascending: false }),
      sb.from("balance_updates").select("*").eq("circle_id", id).order("created_at", { ascending: false }),
    ]);
  if (e2) throw new Error(e2.message);
  if (e3) throw new Error(e3.message);
  if (e4) throw new Error(e4.message);
  if (e5) throw new Error(e5.message);

  const periodIds = new Set(((periods ?? []) as Period[]).map((p) => p.id));
  const relCons = ((contributions ?? []) as Contribution[]).filter((c) =>
    periodIds.has(c.period_id)
  );

  const me = (members ?? []).find((m) => m.user_id === session.id);
  return {
    circle: circle as Circle,
    members: (members ?? []) as (CircleMember & { profile?: Profile })[],
    periods: (periods ?? []) as Period[],
    contributions: relCons,
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
