"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { siteConfig } from "@/config/site";
import { env } from "@/env";
import { checkRateLimit } from "@/lib/redis";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sha256Hex } from "@/lib/hash";
import { AUTH_COOKIE_NAME } from "@/lib/storage-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isDevSandboxActive,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/config";
import {
  buildDevTotpQrDataUrl,
  computeTotpCode,
  generateBase32Secret,
  getDevDb,
  hashDevPassword,
  normalizeLocale,
  saveDevDb,
  verifyDevPassword,
  verifyDevTotpCode,
  type DevUserRecord,
} from "@/lib/dev-store";
import { getRequestClientMeta, recordAuditEvent } from "@/lib/audit";
import {
  clearDevSessionCookie,
  getRoleDestinationPath,
  getServerAuthContext,
  setDevSessionCookie,
} from "@/lib/auth/session";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  sanitizeRedirectPath,
  signupSchema,
  totpCodeSchema,
} from "@/lib/validations/auth";
import type { AppLocale, DataRequestType, UserRole } from "@/types/database";
import { z } from "zod";

const RECENT_AUTH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface AuthActionResult {
  ok: boolean;
  errorCode?: string;
  redirectTo?: string;
  mfaRequired?: boolean;
  needsMfaEnrollment?: boolean;
  devVerificationNotice?: string;
  data?: Record<string, unknown>;
}

function getBaseSiteUrl(): string {
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}

function isProductionMisconfigured(): boolean {
  return env.NODE_ENV === "production" && !isSupabaseAuthConfigured();
}

export async function loginAction(formData: {
  identifier?: string;
  email?: string;
  password: string;
  locale: string;
  next?: string | null;
  turnstileToken?: string;
}): Promise<AuthActionResult> {
  if (isProductionMisconfigured()) {
    console.error("[SECURITY] Login blocked: Supabase not configured in production.");
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const rawIdentifier = (formData.identifier || formData.email || "").trim();
  const parsed = loginSchema.safeParse({
    identifier: rawIdentifier,
    email: rawIdentifier,
    password: formData.password,
  });

  if (!parsed.success) {
    return { ok: false, errorCode: "INVALID_CREDENTIALS" };
  }

  const locale = normalizeLocale(formData.locale);
  const identifierNormalized = rawIdentifier.toLowerCase();
  const meta = await getRequestClientMeta();

  // Dual rate limit: IP + normalized identifier hash
  const [ipLimit, identLimit] = await Promise.all([
    checkRateLimit(meta.ipHash, "auth_login"),
    checkRateLimit(sha256Hex(identifierNormalized), "auth_login"),
  ]);

  if (!ipLimit.success || !identLimit.success) {
    return { ok: false, errorCode: "RATE_LIMITED" };
  }

  const turnstile = await verifyTurnstileToken(formData.turnstileToken, meta.ip);
  if (!turnstile.success) {
    return { ok: false, errorCode: "CAPTCHA_FAILED" };
  }

  const safeNext = sanitizeRedirectPath(formData.next);

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifierNormalized,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      await recordAuditEvent({
        actorId: null,
        action: "auth.login_failed",
        targetType: "auth",
        metadata: { emailHash: sha256Hex(identifierNormalized) },
      });
      return { ok: false, errorCode: "INVALID_CREDENTIALS" };
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, data.user.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: false,
    });

    await recordAuditEvent({
      actorId: data.user.id,
      action: "auth.login_success",
      targetType: "auth",
    });

    return {
      ok: true,
      redirectTo: safeNext ?? `/${locale}/cabinet`,
    };
  }

  // Strictly non-production dev sandbox fallback
  if (!isDevSandboxActive()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const db = getDevDb();
  const rawDigits = rawIdentifier.replace(/\D/g, "");
  const user = db.users.find((u) => {
    if (u.email.toLowerCase() === identifierNormalized) return true;
    const uPhoneDigits = ((u as { phone?: string }).phone || "").replace(/\D/g, "");
    if (rawDigits.length >= 9 && uPhoneDigits.endsWith(rawDigits.slice(-9))) {
      return true;
    }
    return false;
  });

  if (!user || !verifyDevPassword(parsed.data.password, user.passwordHash)) {
    await recordAuditEvent({
      actorId: null,
      action: "auth.login_failed",
      targetType: "auth",
      metadata: { emailHash: sha256Hex(identifierNormalized) },
    });
    return { ok: false, errorCode: "INVALID_CREDENTIALS" };
  }

  const userMemberships = db.companyMembers.filter(
    (m) => m.user_id === user.id
  );
  if (
    userMemberships.length > 0 &&
    !userMemberships.some((m) => m.is_active)
  ) {
    return { ok: false, errorCode: "ACCOUNT_DISABLED" };
  }

  await setDevSessionCookie({
    sid: crypto.randomUUID(),
    uid: user.id,
    email: user.email,
    role: user.role,
    emailVerified: true,
    onboardingCompleted: true,
    aal: "aal1",
    hasMfa: false,
    lastAuthAt: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, user.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: false,
  });

  await recordAuditEvent({
    actorId: user.id,
    action: "auth.login_success",
    targetType: "auth",
  });

  return {
    ok: true,
    redirectTo: safeNext ?? `/${locale}/cabinet`,
  };
}

export async function signupAction(formData: {
  role: UserRole;
  fullName?: string;
  phone?: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptLegal: boolean;
  locale: string;
  turnstileToken?: string;
}): Promise<AuthActionResult> {
  if (isProductionMisconfigured()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const parsed = signupSchema.safeParse({
    role: formData.role,
    fullName: formData.fullName || "",
    phone: formData.phone || "",
    email: formData.email,
    password: formData.password,
    confirmPassword: formData.confirmPassword,
    consent: formData.acceptLegal,
    preferredLanguage: normalizeLocale(formData.locale),
  });

  if (!parsed.success) {
    return { ok: false, errorCode: "VALIDATION_ERROR" };
  }

  const meta = await getRequestClientMeta();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(meta.ipHash, "auth_signup"),
    checkRateLimit(sha256Hex(parsed.data.email), "auth_signup"),
  ]);

  if (!ipLimit.success || !emailLimit.success) {
    return { ok: false, errorCode: "RATE_LIMITED" };
  }

  const turnstile = await verifyTurnstileToken(formData.turnstileToken, meta.ip);
  if (!turnstile.success) {
    return { ok: false, errorCode: "CAPTCHA_FAILED" };
  }

  const {
    email,
    password,
    role,
    fullName,
    phone,
    preferredLanguage: locale,
  } = parsed.data;

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    if (!supabase || !admin) {
      return { ok: false, errorCode: "CONFIG_ERROR" };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          preferred_language: locale,
          full_name: fullName,
          phone,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return { ok: false, errorCode: "EMAIL_EXISTS" };
      }
      return { ok: false, errorCode: "SIGNUP_FAILED" };
    }

    if (data.user) {
      await admin.auth.admin.updateUserById(data.user.id, {
        app_metadata: { role },
      });

      await admin
        .from("profiles")
        .update({
          role,
          full_name: fullName,
          phone,
          preferred_language: locale,
          onboarding_completed: true,
        })
        .eq("id", data.user.id);

      await recordAuditEvent({
        actorId: data.user.id,
        action: "auth.signup",
        targetType: "auth",
        metadata: { role, locale },
      });
    }

    return {
      ok: true,
      redirectTo: `/${locale}/login?registered=1`,
    };
  }

  // Strictly non-production dev sandbox fallback
  if (!isDevSandboxActive()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const db = getDevDb();
  const existingEmail = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingEmail) {
    return { ok: false, errorCode: "EMAIL_EXISTS" };
  }

  const phoneDigits9 = phone.replace(/\D/g, "").slice(-9);
  if (phoneDigits9.length === 9) {
    const existingPhone = db.users.find((u) => {
      const uDigits = ((u as { phone?: string }).phone || "").replace(/\D/g, "");
      return uDigits.endsWith(phoneDigits9);
    });
    if (existingPhone) {
      return { ok: false, errorCode: "PHONE_EXISTS" };
    }
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();

  db.users.push({
    id: userId,
    email,
    phone,
    passwordHash: hashDevPassword(password),
    emailVerified: true,
    role,
    totpSecret: null,
    totpVerified: false,
    onboardingDraft: null,
    createdAt: now,
  } as unknown as DevUserRecord);

  db.profiles.push({
    id: userId,
    role,
    preferred_language: locale,
    full_name: fullName,
    phone,
    onboarding_completed: true,
    onboarding_draft: null,
    deletion_requested_at: null,
    created_at: now,
    updated_at: now,
  });

  saveDevDb();

  await recordAuditEvent({
    actorId: userId,
    action: "auth.signup",
    targetType: "auth",
    metadata: { role, locale },
  });

  return {
    ok: true,
    redirectTo: `/${locale}/login?registered=1`,
  };
}

/**
 * Dev-sandbox-only email verification helper (strictly disabled in production).
 */
export async function devVerifyEmailAction(formData: {
  email: string;
  locale: string;
}): Promise<AuthActionResult> {
  if (!isDevSandboxActive() || env.NODE_ENV === "production") {
    return { ok: false, errorCode: "FORBIDDEN" };
  }

  const emailNormalized = formData.email.trim().toLowerCase();
  const locale = normalizeLocale(formData.locale);
  const db = getDevDb();
  const user = db.users.find((u) => u.email === emailNormalized);
  const profile = user ? db.profiles.find((p) => p.id === user.id) : null;

  if (!user || !profile) {
    return { ok: false, errorCode: "NOT_FOUND" };
  }

  user.emailVerified = true;
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

  return {
    ok: true,
    redirectTo: `/${locale}${getRoleDestinationPath(
      user.role,
      profile.onboarding_completed
    )}`,
  };
}

export async function resendVerificationAction(formData: {
  email: string;
  locale: string;
}): Promise<AuthActionResult> {
  if (isProductionMisconfigured()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const email = formData.email.trim().toLowerCase();
  const locale = normalizeLocale(formData.locale);
  const meta = await getRequestClientMeta();
  const limit = await checkRateLimit(
    `${meta.ipHash}:${sha256Hex(email)}`,
    "auth_reset"
  );
  if (!limit.success) {
    return { ok: false, errorCode: "RATE_LIMITED" };
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${getBaseSiteUrl()}/auth/callback?locale=${locale}&next=${encodeURIComponent("/onboarding")}`,
        },
      });
    }
  }

  // Always return generic success to prevent email enumeration
  return { ok: true };
}

export async function forgotPasswordAction(formData: {
  email: string;
  locale: string;
  turnstileToken?: string;
}): Promise<AuthActionResult> {
  if (isProductionMisconfigured()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.email });
  if (!parsed.success) {
    return { ok: false, errorCode: "VALIDATION_ERROR" };
  }

  const locale = normalizeLocale(formData.locale);
  const meta = await getRequestClientMeta();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(meta.ipHash, "auth_reset"),
    checkRateLimit(sha256Hex(parsed.data.email), "auth_reset"),
  ]);

  if (!ipLimit.success || !emailLimit.success) {
    return { ok: false, errorCode: "RATE_LIMITED" };
  }

  const turnstile = await verifyTurnstileToken(formData.turnstileToken, meta.ip);
  if (!turnstile.success) {
    return { ok: false, errorCode: "CAPTCHA_FAILED" };
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${getBaseSiteUrl()}/auth/callback?type=recovery&locale=${locale}`,
      });
    }
  } else if (isDevSandboxActive()) {
    const db = getDevDb();
    const user = db.users.find((u) => u.email === parsed.data.email);
    if (user) {
      const rawToken = crypto.randomBytes(24).toString("hex");
      db.resetTokens.push({
        tokenHash: sha256Hex(rawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      });
      saveDevDb();
      console.info(
        `[DEV SANDBOX] Password reset token for ${user.email}: /${locale}/reset-password?dev_token=${rawToken}`
      );
    }
  }

  // Strict anti-enumeration: identical outcome whether email exists or not
  return { ok: true };
}

export async function resetPasswordAction(formData: {
  password: string;
  confirmPassword: string;
  locale: string;
  devToken?: string;
}): Promise<AuthActionResult> {
  if (isProductionMisconfigured()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.password,
    confirmPassword: formData.confirmPassword,
  });

  if (!parsed.success) {
    return { ok: false, errorCode: "VALIDATION_ERROR" };
  }

  const locale = normalizeLocale(formData.locale);

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, errorCode: "SESSION_EXPIRED" };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return { ok: false, errorCode: "RESET_FAILED" };
    }

    await recordAuditEvent({
      actorId: user.id,
      action: "auth.password_reset",
      targetType: "auth",
    });

    return { ok: true, redirectTo: `/${locale}/login?reset=success` };
  }

  if (!isDevSandboxActive()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const db = getDevDb();
  let targetUserId: string | null = null;

  if (formData.devToken) {
    const hash = sha256Hex(formData.devToken);
    const tok = db.resetTokens.find(
      (t) => t.tokenHash === hash && new Date(t.expiresAt).getTime() > Date.now()
    );
    if (tok) {
      targetUserId = tok.userId;
      db.resetTokens = db.resetTokens.filter((t) => t.tokenHash !== hash);
    }
  } else {
    const ctx = await getServerAuthContext();
    targetUserId = ctx?.userId ?? null;
  }

  if (!targetUserId) {
    return { ok: false, errorCode: "SESSION_EXPIRED" };
  }

  const user = db.users.find((u) => u.id === targetUserId);
  if (!user) {
    return { ok: false, errorCode: "SESSION_EXPIRED" };
  }

  user.passwordHash = hashDevPassword(parsed.data.password);
  saveDevDb();

  await recordAuditEvent({
    actorId: user.id,
    action: "auth.password_reset",
    targetType: "auth",
  });

  return { ok: true, redirectTo: `/${locale}/login?reset=success` };
}

export async function enrollTotpAction(): Promise<AuthActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) {
    return { ok: false, errorCode: "UNAUTHORIZED" };
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    // Remove stale unverified factors first so repeated enrollments stay clean
    const { data: existingFactors } = await supabase.auth.mfa.listFactors();
    const unverified =
      existingFactors?.totp?.filter((f) => f.status !== "verified") ?? [];
    for (const f of unverified) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `${siteConfig.name} Authenticator`,
    });

    if (error || !data) {
      return { ok: false, errorCode: "MFA_ENROLL_FAILED" };
    }

    return {
      ok: true,
      data: {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      },
    };
  }

  if (!isDevSandboxActive()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const db = getDevDb();
  const user = db.users.find((u) => u.id === ctx.userId);
  if (!user) return { ok: false, errorCode: "UNAUTHORIZED" };

  const secret = generateBase32Secret();
  user.totpSecret = secret;
  user.totpVerified = false;
  saveDevDb();

  const label = encodeURIComponent(`${siteConfig.name}:${user.email}`);
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(siteConfig.name)}`;
  const qrCode = buildDevTotpQrDataUrl(secret, user.email);
  const currentCode = computeTotpCode(secret, 0);

  return {
    ok: true,
    data: {
      factorId: `dev-totp-${user.id}`,
      qrCode,
      secret,
      uri,
      // Returned strictly in dev sandbox for tester convenience; absent in Supabase prod
      devCurrentTotpCode: currentCode,
    },
  };
}

export async function verifyTotpAction(formData: {
  code: string;
  factorId?: string;
  locale: string;
  next?: string | null;
}): Promise<AuthActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) {
    return { ok: false, errorCode: "UNAUTHORIZED" };
  }

  const parsed = totpCodeSchema.safeParse(formData.code);
  if (!parsed.success) {
    return { ok: false, errorCode: "INVALID_TOTP" };
  }

  const meta = await getRequestClientMeta();
  const limit = await checkRateLimit(ctx.userId || meta.ipHash, "mfa_verify");
  if (!limit.success) {
    return { ok: false, errorCode: "RATE_LIMITED" };
  }

  const locale = normalizeLocale(formData.locale);
  const safeNext = sanitizeRedirectPath(formData.next);

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    let factorId = formData.factorId;
    if (!factorId) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      factorId =
        factors?.totp?.find((f) => f.status === "verified")?.id ??
        factors?.totp?.[0]?.id;
    }

    if (!factorId) {
      return { ok: false, errorCode: "MFA_NOT_ENROLLED" };
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: parsed.data,
    });

    if (error) {
      return { ok: false, errorCode: "INVALID_TOTP" };
    }

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: ctx.membership?.company_id,
      action: "auth.mfa_verified",
      targetType: "auth",
    });

    return {
      ok: true,
      redirectTo:
        safeNext ??
        `/${locale}${getRoleDestinationPath(
          ctx.role,
          ctx.profile.onboarding_completed
        )}`,
    };
  }

  if (!isDevSandboxActive()) {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  const db = getDevDb();
  const user = db.users.find((u) => u.id === ctx.userId);
  if (!user || !user.totpSecret) {
    return { ok: false, errorCode: "MFA_NOT_ENROLLED" };
  }

  if (!verifyDevTotpCode(user.totpSecret, parsed.data)) {
    return { ok: false, errorCode: "INVALID_TOTP" };
  }

  user.totpVerified = true;
  saveDevDb();

  await setDevSessionCookie({
    sid: crypto.randomUUID(),
    uid: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    onboardingCompleted: ctx.profile.onboarding_completed,
    aal: "aal2",
    hasMfa: true,
    lastAuthAt: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });

  await recordAuditEvent({
    actorId: ctx.userId,
    companyId: ctx.membership?.company_id,
    action: "auth.mfa_verified",
    targetType: "auth",
  });

  return {
    ok: true,
    redirectTo:
      safeNext ??
      `/${locale}${getRoleDestinationPath(
        ctx.role,
        ctx.profile.onboarding_completed
      )}`,
  };
}

export async function unenrollTotpAction(formData: {
  currentPassword: string;
}): Promise<AuthActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };

  // Owners and dispatchers must retain MFA at all times
  if (ctx.role === "company_owner" || ctx.role === "dispatcher") {
    return { ok: false, errorCode: "MFA_MANDATORY_FOR_ROLE" };
  }

  if (Date.now() - ctx.lastAuthAt > RECENT_AUTH_WINDOW_MS) {
    return { ok: false, errorCode: "REAUTH_REQUIRED" };
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    // Re-verify password on sensitive factor removal
    const { error: checkErr } = await supabase.auth.signInWithPassword({
      email: ctx.email,
      password: formData.currentPassword,
    });
    if (checkErr) {
      return { ok: false, errorCode: "INVALID_CREDENTIALS" };
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp?.find((f) => f.status === "verified");
    if (verified) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
      if (error) return { ok: false, errorCode: "MFA_UNENROLL_FAILED" };
    }

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: ctx.membership?.company_id,
      action: "auth.mfa_disabled",
      targetType: "auth",
    });

    return { ok: true };
  }

  if (!isDevSandboxActive()) return { ok: false, errorCode: "CONFIG_ERROR" };

  const db = getDevDb();
  const user = db.users.find((u) => u.id === ctx.userId);
  if (!user || !verifyDevPassword(formData.currentPassword, user.passwordHash)) {
    return { ok: false, errorCode: "INVALID_CREDENTIALS" };
  }

  user.totpSecret = null;
  user.totpVerified = false;
  saveDevDb();

  await setDevSessionCookie({
    sid: crypto.randomUUID(),
    uid: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    onboardingCompleted: ctx.profile.onboarding_completed,
    aal: "aal1",
    hasMfa: false,
    lastAuthAt: ctx.lastAuthAt,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });

  await recordAuditEvent({
    actorId: ctx.userId,
    companyId: ctx.membership?.company_id,
    action: "auth.mfa_disabled",
    targetType: "auth",
  });

  return { ok: true };
}

export async function changePasswordAction(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };

  const parsed = resetPasswordSchema.safeParse({
    password: formData.newPassword,
    confirmPassword: formData.confirmPassword,
  });
  if (!parsed.success) {
    return { ok: false, errorCode: "VALIDATION_ERROR" };
  }

  if (Date.now() - ctx.lastAuthAt > RECENT_AUTH_WINDOW_MS) {
    // Allow immediate re-verification via currentPassword below, or block stale sessions
    if (!formData.currentPassword) {
      return { ok: false, errorCode: "REAUTH_REQUIRED" };
    }
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: ctx.email,
      password: formData.currentPassword,
    });
    if (verifyErr) {
      return { ok: false, errorCode: "INVALID_CREDENTIALS" };
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (updateErr) {
      return { ok: false, errorCode: "PASSWORD_CHANGE_FAILED" };
    }

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: ctx.membership?.company_id,
      action: "auth.password_changed",
      targetType: "auth",
    });

    return { ok: true };
  }

  if (!isDevSandboxActive()) return { ok: false, errorCode: "CONFIG_ERROR" };

  const db = getDevDb();
  const user = db.users.find((u) => u.id === ctx.userId);
  if (!user || !verifyDevPassword(formData.currentPassword, user.passwordHash)) {
    return { ok: false, errorCode: "INVALID_CREDENTIALS" };
  }

  user.passwordHash = hashDevPassword(parsed.data.password);
  saveDevDb();

  await recordAuditEvent({
    actorId: ctx.userId,
    companyId: ctx.membership?.company_id,
    action: "auth.password_changed",
    targetType: "auth",
  });

  return { ok: true };
}

export async function signOutAction(localeInput: string): Promise<AuthActionResult> {
  const ctx = await getServerAuthContext();
  const locale = normalizeLocale(localeInput);

  if (ctx) {
    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: ctx.membership?.company_id,
      action: "auth.logout",
      targetType: "auth",
    });
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } else if (isDevSandboxActive()) {
    await clearDevSessionCookie();
  }

  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  return { ok: true, redirectTo: `/${locale}/login` };
}

const dataRequestSchema = z.object({
  requestType: z.enum(["export", "delete"]),
});

export async function createDataRequestAction(formData: {
  requestType: DataRequestType;
}): Promise<AuthActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };

  const parsed = dataRequestSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  const meta = await getRequestClientMeta();
  const limit = await checkRateLimit(ctx.userId || meta.ipHash, "portal_mutation");
  if (!limit.success) return { ok: false, errorCode: "RATE_LIMITED" };

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await supabase.from("data_requests").insert({
      user_id: ctx.userId,
      request_type: parsed.data.requestType,
    });

    if (error) return { ok: false, errorCode: "REQUEST_FAILED" };
  } else if (isDevSandboxActive()) {
    const db = getDevDb();
    db.dataRequests.unshift({
      id: crypto.randomUUID(),
      user_id: ctx.userId,
      request_type: parsed.data.requestType,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    saveDevDb();
  } else {
    return { ok: false, errorCode: "CONFIG_ERROR" };
  }

  await recordAuditEvent({
    actorId: ctx.userId,
    companyId: ctx.membership?.company_id,
    action: `privacy.${parsed.data.requestType}`,
    targetType: "data_request",
  });

  return { ok: true };
}
