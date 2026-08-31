import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — aman diabaikan bila middleware menangani refresh
          }
        },
      },
    }
  );
}
