import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { Database } from "@/types/database";

/**
 * Server-only administrative Supabase client using `service_role`.
 * NEVER import in client components or expose to the browser.
 * Only use for server-controlled operations (e.g., setting `app_metadata.role`,
 * hashed invite lookup/redemption, audit logging, signed proof URLs, waitlist inserts).
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> | null {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
