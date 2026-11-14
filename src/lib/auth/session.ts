import { cookies } from "next/headers";
import { redirect } from "@/i18n/routing";
import { env } from "@/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDevSandboxActive, isSupabaseAuthConfigured } from "@/lib/supabase/config";
import {
  DEV_SESSION_COOKIE_NAME,
  signDevSessionCookie,
  verifyDevSessionCookie,
  type DevSessionCookiePayload,
} from "@/lib/auth/dev-cookie";
import { getDevDb } from "@/lib/dev-store";
import type {
  AppLocale,
  CompanyMemberRow,
  CompanyRow,
  ProfileRow,
  UserRole,
} from "@/types/database";

export interface ServerAuthContext {
  userId: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  profile: ProfileRow;
  membership: CompanyMemberRow | null;
  company: CompanyRow | null;
  aal: "aal1" | "aal2";
  hasTotpFactor: boolean;
  mfaVerified: boolean;
  lastAuthAt: number;
  isDevSandbox: boolean;
}

const VALID_ROLES: ReadonlySet<string> = new Set([
  "company_owner",
  "dispatcher",
  "driver",
]);

function coerceRole(raw: unknown, fallback: UserRole = "driver"): UserRole {
  return typeof raw === "string" && VALID_ROLES.has(raw)
    ? (raw as UserRole)
    : fallback;
}

export async function setDevSessionCookie(
  payload: DevSessionCookiePayload
): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("[SECURITY] Cannot set dev session cookie in production.");
  }
  const token = await signDevSessionCookie(payload);
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearDevSessionCookie(): Promise<void> {
  if (env.NODE_ENV === "production") {
    return;
  }
  const cookieStore = await cookies();
  cookieStore.delete(DEV_SESSION_COOKIE_NAME);
}

/**
 * Resolves the currently authenticated user, verified server-side role, profile,
 * company membership, and MFA assurance level.
 */
export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    const admin = createSupabaseAdminClient();
    const reader = admin ?? supabase;

    const { data: profile } = await reader
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const serverRole = coerceRole(
      profile?.role ?? user.app_metadata?.role,
      "driver"
    );

    const { data: membership } = await reader
      .from("company_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let company: CompanyRow | null = null;
    if (membership?.company_id) {
      const { data: comp } = await reader
        .from("companies")
        .select("*")
        .eq("id", membership.company_id)
        .maybeSingle();
      company = comp ?? null;
    }

    let aal: "aal1" | "aal2" = "aal1";
    let hasTotpFactor = false;

    try {
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        aal = "aal2";
      }
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      hasTotpFactor = Boolean(
        factorsData?.totp?.some((f) => f.status === "verified")
      );
    } catch {
      aal = "aal1";
    }

    const lastSignInMs = user.last_sign_in_at
      ? new Date(user.last_sign_in_at).getTime()
      : Date.now();

    const safeProfile: ProfileRow = profile ?? {
      id: user.id,
      role: serverRole,
      full_name: null,
      phone: null,
      preferred_language: "uz",
      onboarding_completed: false,
      onboarding_draft: {},
      deletion_requested_at: null,
      created_at: user.created_at,
      updated_at: user.created_at,
    };

    return {
      userId: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_confirmed_at),
      role: serverRole,
      profile: safeProfile,
      membership: membership ?? null,
      company,
      aal,
      hasTotpFactor,
      mfaVerified: aal === "aal2",
      lastAuthAt: Number.isFinite(lastSignInMs) ? lastSignInMs : Date.now(),
      isDevSandbox: false,
    };
  }

  if (!isDevSandboxActive()) {
    return null;
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(DEV_SESSION_COOKIE_NAME)?.value;
  const session = await verifyDevSessionCookie(rawToken);
  if (!session) {
    return null;
  }

  const db = getDevDb();
  const userRecord = db.users.find((u) => u.id === session.uid);
  const profile = db.profiles.find((p) => p.id === session.uid);

  if (!userRecord || !profile) {
    return null;
  }

  const membership =
    db.companyMembers.find(
      (m) => m.user_id === session.uid && m.is_active
    ) ?? null;

  const company = membership
    ? db.companies.find((c) => c.id === membership.company_id) ?? null
    : null;

  return {
    userId: userRecord.id,
    email: userRecord.email,
    emailVerified: userRecord.emailVerified,
    role: userRecord.role,
    profile,
    membership,
    company,
    aal: session.aal,
    hasTotpFactor: Boolean(userRecord.totpSecret && userRecord.totpVerified),
    mfaVerified: session.aal === "aal2",
    lastAuthAt: session.lastAuthAt,
    isDevSandbox: true,
  };
}

export function getRoleDestinationPath(
  role: UserRole,
  onboardingCompleted: boolean
): string {
  if (!onboardingCompleted) {
    return "/onboarding";
  }
  return role === "driver" ? "/app/driver" : "/app/company";
}

export async function requirePortalAccess(options: {
  locale: AppLocale;
  allowedRoles: UserRole[];
  currentPath: string;
}): Promise<ServerAuthContext> {
  const ctx = await getServerAuthContext();

  if (!ctx) {
    redirect({
      href: `/login?next=${encodeURIComponent(options.currentPath)}`,
      locale: options.locale,
    });
    throw new Error("Redirecting unauthenticated user");
  }

  if (!ctx.emailVerified) {
    redirect({
      href: `/verify-email?email=${encodeURIComponent(ctx.email)}`,
      locale: options.locale,
    });
    throw new Error("Redirecting unverified user");
  }

  if (!ctx.profile.onboarding_completed) {
    redirect({
      href: "/onboarding",
      locale: options.locale,
    });
    throw new Error("Redirecting to onboarding");
  }

  const requiresMfa =
    ctx.role === "company_owner" || ctx.role === "dispatcher";
  if (requiresMfa && (!ctx.hasTotpFactor || !ctx.mfaVerified)) {
    redirect({
      href: `/login?mfa=required&next=${encodeURIComponent(options.currentPath)}`,
      locale: options.locale,
    });
    throw new Error("Redirecting for MFA verification");
  }

  if (!options.allowedRoles.includes(ctx.role)) {
    redirect({
      href: getRoleDestinationPath(ctx.role, ctx.profile.onboarding_completed),
      locale: options.locale,
    });
    throw new Error("Forbidden role redirect");
  }

  return ctx;
}
