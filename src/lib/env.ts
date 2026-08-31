/**
 * Mode demo aktif ketika kredensial Supabase belum diisi di .env.local.
 * Saat key asli sudah diisi, aplikasi otomatis memakai backend live.
 */
export const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT_REF") ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.length < 20;

/**
 * Supabase API key. Prefers the new-format publishable key, falling back to
 * the legacy anon key for projects that have not migrated yet.
 */
export function supabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}
