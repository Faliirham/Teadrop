import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SAFE_INTERNAL = ["/login", "/auth/callback"];

/** Pastikan redirect target berupa path relatif internal (cegah open redirect). */
function sanitizeNext(value: string | null): string | null {
  if (!value) return null;
  // Hanya terima path absolut internal, tanpa skema, tanpa "//host".
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  // Tolak iframe data: /javascript: dst.
  if (/[\r\n]/.test(value)) return null;
  // Lindungi dari pengalihan balik ke rute auth itu sendiri.
  const path = value.split("?")[0];
  if (SAFE_INTERNAL.includes(path)) return null;
  return value;
}

/** Tukar code dari magic-link/email-OTP menjadi session cookie */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));
  // Pertahankan tujuan awal agar user bisa coba lagi tanpa kehilangan konteks.
  const loginBase = `${origin}/login?error=gagal_verifikasi${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  if (!code) {
    return NextResponse.redirect(`${loginBase}&reason=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return NextResponse.redirect(`${origin}${next ?? "/"}`);
  }
  return NextResponse.redirect(`${loginBase}&reason=exchange_failed`);
}
