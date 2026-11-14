import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDevSandboxActive } from "@/lib/supabase/config";
import { getDevDb, saveDevDb } from "@/lib/dev-store";
import { setDevSessionCookie, getRoleDestinationPath } from "@/lib/auth/session";
import { sanitizeRedirectPath } from "@/lib/validations/auth";
import { sha256Hex } from "@/lib/hash";
import type { AppLocale, UserRole } from "@/types/database";

const LOCALES = new Set(["uz", "ru", "en"]);

function extractLocale(raw: string | null): AppLocale {
  if (raw && LOCALES.has(raw)) {
    return raw as AppLocale;
  }
  return "uz";
}

/**
 * Supabase Auth PKCE callback & email verification / password recovery redirect handler.
 * Validates `next` via strict relative-path allowlist to block open redirects.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const locale = extractLocale(url.searchParams.get("locale"));
  const safeNext = sanitizeRedirectPath(url.searchParams.get("next"));
  const devVerifyToken = url.searchParams.get("dev_verify");

  // Strictly dev-only sandbox verification token handler (disabled in production)
  if (devVerifyToken && isDevSandboxActive()) {
    const db = getDevDb();
    const tokenHash = sha256Hex(devVerifyToken);
    const entry = db.verifyTokens.find(
      (t) => t.tokenHash === tokenHash && new Date(t.expiresAt).getTime() > Date.now()
    );

    if (entry) {
      const user = db.users.find((u) => u.id === entry.userId);
      const profile = db.profiles.find((p) => p.id === entry.userId);
      if (user && profile) {
        user.emailVerified = true;
        db.verifyTokens = db.verifyTokens.filter((t) => t.tokenHash !== tokenHash);
        saveDevDb();

        await setDevSessionCookie({
          sid: crypto.randomUUID(),
          uid: user.id,
          email: user.email,
          role: user.role,
          emailVerified: true,
          onboardingCompleted: profile.onboarding_completed,
          aal: "aal1",
          hasMfa: Boolean(user.totpSecret && user.totpVerified),
          lastAuthAt: Date.now(),
          exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
        });

        const dest =
          safeNext ??
          `/${locale}${getRoleDestinationPath(user.role, profile.onboarding_completed)}`;
        return NextResponse.redirect(new URL(dest, url.origin));
      }
    }
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=invalid_link`, url.origin)
    );
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        if (type === "recovery") {
          return NextResponse.redirect(
            new URL(`/${locale}/reset-password`, url.origin)
          );
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", data.user.id)
          .maybeSingle();

        const role = (profile?.role ?? data.user.app_metadata?.role ?? "driver") as UserRole;
        const onboarded = Boolean(profile?.onboarding_completed);
        const dest =
          safeNext ?? `/${locale}${getRoleDestinationPath(role, onboarded)}`;

        return NextResponse.redirect(new URL(dest, url.origin));
      }
    }
  }

  return NextResponse.redirect(
    new URL(`/${locale}/login?error=auth_callback_failed`, url.origin)
  );
}
