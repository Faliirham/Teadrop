import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode, supabaseKey } from "@/lib/env";

const PROTECTED_PREFIXES = ["/circles", "/join", "/settings"];
const AUTH_PAGES = ["/login"];

function buildClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  return { supabase, supabaseResponse };
}

export async function updateSession(request: NextRequest) {
  // Mode demo tidak punya sesi server — biarkan lewat
  if (isDemoMode) return NextResponse.next();

  const { supabase, supabaseResponse } = buildClient(request);

  // getUser() memvalidasi token ke server Auth (jangan pakai getSession()).
  // Jika Auth tidak terjangkau (DNS down / project paused), anggap belum
  // login agar route protected redirect ke /login, bukan 500.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
