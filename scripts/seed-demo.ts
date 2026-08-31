/**
 * Dev-only seed for the live Supabase backend.
 *
 * Attaches a sample circle ("Squad Teh Tarik") — with dummy members, periods,
 * contributions, balance history, moments + gallery photos, and a meetup — to a
 * target account so the live UI has data to explore.
 *
 * Runs with the SERVICE ROLE key (bypasses RLS). Idempotent: if the target user
 * already has a circle with the same name, it no-ops.
 *
 * Usage:
 *   npm run db:seed -- --email you@example.com
 *
 * Env: read from process.env, falling back to .env.local
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const DEFAULT_PASSWORD = "Teadrop-demo-2026!";
const CIRCLE_NAME = "Squad Teh Tarik";

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore missing file */
  }
  return out;
}

function getArg(param: string): string | null {
  const i = process.argv.indexOf(`--${param}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${param}=`));
  return eq ? eq.split("=")[1] : null;
}

function inviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TEA";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

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

function inDays(d: number, h = 19): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(h, 0, 0, 0);
  return dt.toISOString();
}

async function main() {
  const local = parseEnvFile(".env.local");
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || local.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (set them or put them in .env.local)"
    );
  }

  const targetEmail = getArg("email");
  if (!targetEmail) {
    throw new Error("Pass the target account: npm run db:seed -- --email you@example.com");
  }

  const sb = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const findUser = async (email: string): Promise<{ id: string } | null> => {
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`listUsers: ${error.message}`);
      const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (hit) return { id: hit.id };
      if (data.users.length < 1000) break;
    }
    return null;
  };

  type SeededUser = { id: string; created: boolean };

  const ensureUser = async (email: string, name: string): Promise<SeededUser> => {
    const existing = await findUser(email);
    if (existing) {
      await sb
        .from("profiles")
        .upsert({ id: existing.id, full_name: name }, { onConflict: "id" });
      console.log(`user ${email}: exists`);
      return { id: existing.id, created: false };
    }
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    await sb.from("profiles").insert({ id: data.user.id, full_name: name });
    console.log(`user ${email}: created (password: ${DEFAULT_PASSWORD})`);
    return { id: data.user.id, created: true };
  };

  const now = new Date().toISOString();

  // 1. Target admin account + dummy members
  const admin = await ensureUser(targetEmail, "Bendahara");
  const dina = await ensureUser("dina@demo.id", "Dina");
  const rizky = await ensureUser("rizky@demo.id", "Rizky");
  const sari = await ensureUser("sari@demo.id", "Sari");

  // 2. Reset any previously seeded circle for this admin (children cascade)
  const { data: existing } = await sb
    .from("circles")
    .select("id")
    .eq("name", CIRCLE_NAME)
    .eq("created_by", admin.id)
    .is("deleted_at", null);
  if (existing && existing.length > 0) {
    const { error: errDel } = await sb
      .from("circles")
      .delete()
      .eq("name", CIRCLE_NAME)
      .eq("created_by", admin.id)
      .is("deleted_at", null);
    if (errDel) throw new Error(`reset: ${errDel.message}`);
    console.log(`reset previous seed: deleted ${existing.length} circle(s) for ${targetEmail}`);
  }

  // 3. Circle
  const { data: circle, error: errCircle } = await sb
    .from("circles")
    .insert({
      name: CIRCLE_NAME,
      description: "Iuran ngeteh tiap Jumat & kas sosial",
      invite_code: inviteCode(),
      default_amount: 25000,
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (errCircle) throw new Error(`circle: ${errCircle.message}`);
  const circleId = circle.id;

  // 4. Members (admin inserted automatically by on_circle_created trigger)
  const memberRows = [
    { user_id: dina.id, role: "member" },
    { user_id: rizky.id, role: "member" },
    { user_id: sari.id, role: "member" },
  ];
  const { error: errMembers } = await sb
    .from("circle_members")
    .insert(memberRows.map((m) => ({ ...m, circle_id: circleId, joined_at: now })));
  if (errMembers) throw new Error(`members: ${errMembers.message}`);
  const { data: members, error: errMembersGet } = await sb
    .from("circle_members")
    .select("id,user_id")
    .eq("circle_id", circleId);
  if (errMembersGet) throw new Error(`members fetch: ${errMembersGet.message}`);
  const byUser = new Map<string, { id: string }>(members.map((m) => [m.user_id, m]));

  // 5. Periods
  const juli = {
    id: randomUUID(),
    circle_id: circleId,
    name: "Juli 2026",
    start_date: "2026-07-01",
    due_date: "2026-07-25",
    amount_per_member: 25000,
    is_closed: true,
    created_at: now,
  };
  const ags = {
    id: randomUUID(),
    circle_id: circleId,
    name: "Agustus 2026",
    start_date: "2026-08-01",
    due_date: "2026-08-25",
    amount_per_member: 25000,
    is_closed: false,
    created_at: now,
  };
  const { error: errPeriods } = await sb.from("periods").insert([juli, ags]);
  if (errPeriods) throw new Error(`periods: ${errPeriods.message}`);

  // 6. Contributions
  const mid = (u: SeededUser) => byUser.get(u.id)!.id;
  const contributions = [
    { period_id: juli.id, member_id: mid(dina), amount: 25000, paid_at: "2026-07-15", method: "transfer", note: null, recorded_by: admin.id, created_at: now },
    { period_id: juli.id, member_id: mid(rizky), amount: 25000, paid_at: "2026-07-16", method: "qris", note: null, recorded_by: admin.id, created_at: now },
    { period_id: juli.id, member_id: mid(sari), amount: 25000, paid_at: "2026-07-18", method: "cash", note: "Dibawa tunai", recorded_by: admin.id, created_at: now },
    { period_id: juli.id, member_id: mid(admin), amount: 25000, paid_at: "2026-07-20", method: "transfer", note: null, recorded_by: admin.id, created_at: now },
    { period_id: ags.id, member_id: mid(sari), amount: 25000, paid_at: "2026-08-04", method: "qris", note: null, recorded_by: admin.id, created_at: now },
    { period_id: ags.id, member_id: mid(rizky), amount: 15000, paid_at: "2026-08-09", method: "cash", note: "Bayar sebagian dulu", recorded_by: admin.id, created_at: now },
  ];
  const { error: errContribs } = await sb.from("contributions").insert(contributions);
  if (errContribs) throw new Error(`contributions: ${errContribs.message}`);

  // 7. Balance history (audit trail)
  const { error: errBalances } = await sb.from("balance_updates").insert([
    { circle_id: circleId, previous_amount: 0, new_amount: 500000, note: "Setoran awal ke reksa dana pasar uang (Bibit)", recorded_by: admin.id, created_at: now },
    { circle_id: circleId, previous_amount: 500000, new_amount: 1250000, note: "Saldo RDPU terbaru + iuran Juli masuk semua", recorded_by: admin.id, created_at: now },
  ]);
  if (errBalances) throw new Error(`balances: ${errBalances.message}`);

  // 8. Moments + gallery photos (inline SVG, no storage upload)
  const mom1 = { id: randomUUID(), circle_id: circleId, author_id: dina.id, content: "Nongkrong Jumat barusan rame banget! Kas-nya juga udah beres semua.", created_at: now };
  const mom2 = { id: randomUUID(), circle_id: circleId, author_id: rizky.id, content: "Setor iuran minggu ini udah gue transfer ya. Cek dashboard!", created_at: now };
  const { error: errMoments } = await sb.from("moments").insert([mom1, mom2]);
  if (errMoments) throw new Error(`moments: ${errMoments.message}`);
  const { error: errPhotos } = await sb.from("moment_photos").insert([
    { moment_id: mom1.id, url: svgPhoto("Teh", "#10b981", "#0d9488"), storage_path: null, created_at: now },
    { moment_id: mom1.id, url: svgPhoto("Jumat", "#14b8a6", "#0f766e"), storage_path: null, created_at: now },
    { moment_id: mom2.id, url: svgPhoto("Setor", "#6366f1", "#4338ca"), storage_path: null, created_at: now },
  ]);
  if (errPhotos) throw new Error(`photos: ${errPhotos.message}`);

  // 9. Meetup + RSVPs
  const meetup = { id: randomUUID(), circle_id: circleId, title: "Ngopi bareng Jumat", description: "Ngumpul santai sambil bahas kas bulan depan.", location: "Kopi Kenangan, Setiabudi", start_at: inDays(5), created_by: admin.id, created_at: now };
  const { error: errMeetup } = await sb.from("meetups").insert(meetup);
  if (errMeetup) throw new Error(`meetup: ${errMeetup.message}`);
  const { error: errRsvps } = await sb.from("meetup_rsvps").insert([
    { meetup_id: meetup.id, member_id: mid(dina), status: "going", created_at: now },
    { meetup_id: meetup.id, member_id: mid(rizky), status: "going", created_at: now },
    { meetup_id: meetup.id, member_id: mid(sari), status: "maybe", created_at: now },
    { meetup_id: meetup.id, member_id: mid(admin), status: "going", created_at: now },
  ]);
  if (errRsvps) throw new Error(`rsvps: ${errRsvps.message}`);

  console.log("seeded:");
  console.log(`  circle "${CIRCLE_NAME}" (admin: ${targetEmail})`);
  console.log(`  members: 4 (Bendahara + Dina, Rizky, Sari)`);
  console.log(`  periods: Juli (closed), Agustus 2026 (active)`);
  console.log(`  contributions: ${contributions.length}, balance updates: 2`);
  console.log(`  moments: 2 (+3 photos), meetup: 1 (+4 RSVPs)`);
  if (admin.created) {
    console.log(`\nTarget account created — log in with:`);
    console.log(`  email:    ${targetEmail}`);
    console.log(`  password: ${DEFAULT_PASSWORD}`);
  } else {
    console.log(`\nTarget account already existed — log in with your existing method (magic link / password).`);
  }
}

main().catch((e) => {
  console.error("seed failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});