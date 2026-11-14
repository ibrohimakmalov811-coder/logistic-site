import { env } from "@/env";

/**
 * Checks whether Supabase browser/anon auth credentials are configured.
 */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Checks whether Supabase service_role administrative credentials are configured.
 */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * True ONLY during non-production execution when Supabase is not configured yet.
 * Never returns true in production (`NODE_ENV === "production"`).
 */
export function isDevSandboxActive(): boolean {
  if (env.NODE_ENV === "production") {
    return false;
  }
  return !isSupabaseAuthConfigured();
}
