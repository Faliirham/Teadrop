/**
 * Mode demo aktif ketika kredensial Supabase belum diisi di .env.local.
 * Saat key asli sudah diisi, aplikasi otomatis memakai backend live.
 */
export const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT_REF") ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.length < 20;
