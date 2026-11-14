import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { env } from "@/env";
import type { Database, UserRole } from "@/types/database";

export interface MiddlewareSupabaseResult {
  user: User | null;
  role: UserRole;
  emailVerified: boolean;
  aal: "aal1" | "aal2" | null;
  hasMfa: boolean;
  onboardingCompleted: boolean;
}

const VALID_ROLES = new Set<string>(["company_owner", "dispatcher", "driver"]);

/**
 * Refreshes Supabase SSR auth cookies inside Next.js middleware and returns
 * verified user identity, server-controlled role, onboarding flag, and AAL status.
 */
export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<MiddlewareSupabaseResult> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      role: "driver",
      emailVerified: false,
      aal: null,
      hasMfa: false,
      onboardingCompleted: false,
    };
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: env.NODE_ENV === "production",
          });
        });
      },
    },
  });

  // Always re-validate JWT via Auth server instead of trusting cookie claims alone
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      role: "driver",
      emailVerified: false,
      aal: null,
      hasMfa: false,
      onboardingCompleted: false,
    };
  }

  let aal: "aal1" | "aal2" | null = "aal1";
  let hasMfa = false;
  try {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === "aal2") {
      aal = "aal2";
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    hasMfa = Boolean(factors?.totp?.some((f) => f.status === "verified"));
  } catch {
    aal = "aal1";
  }

  let onboardingCompleted = false;
  let profileRole: unknown = user.app_metadata?.role;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    onboardingCompleted = Boolean(profile?.onboarding_completed);
    if (profile?.role) {
      profileRole = profile.role;
    }
  } catch {
    onboardingCompleted = false;
  }

  const role: UserRole =
    typeof profileRole === "string" && VALID_ROLES.has(profileRole)
      ? (profileRole as UserRole)
      : "driver";

  return {
    user,
    role,
    emailVerified: Boolean(user.email_confirmed_at),
    aal,
    hasMfa,
    onboardingCompleted,
  };
}
