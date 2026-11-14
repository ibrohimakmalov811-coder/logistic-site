import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/env";
import type { Database } from "@/types/database";

/**
 * Creates a request-scoped Supabase server client using httpOnly cookies via @supabase/ssr.
 * Returns null when public Supabase credentials are absent.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: env.NODE_ENV === "production",
            });
          });
        } catch {
          // Called from a Server Component where setting cookies is handled in middleware
        }
      },
    },
  });
}
