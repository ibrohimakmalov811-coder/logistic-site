import { z } from "zod";

export const signupRoleSchema = z.enum(["company_owner", "dispatcher", "driver"], {
  errorMap: () => ({ message: "authValidation.roleRequired" }),
});

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "authValidation.emailInvalid" })
  .max(254, { message: "authValidation.emailTooLong" });

export const passwordSchema = z
  .string()
  .min(8, { message: "authValidation.passwordMin" })
  .max(128, { message: "authValidation.passwordMax" })
  .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
    message: "authValidation.passwordComplexity",
  });

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).optional(),
    email: z.string().trim().optional(),
    password: z
      .string()
      .min(1, { message: "authValidation.passwordRequired" })
      .max(128, { message: "authValidation.passwordMax" }),
    nextPath: z.string().optional(),
    turnstileToken: z.string().optional(),
  })
  .refine((data) => Boolean(data.identifier || data.email), {
    message: "authValidation.emailInvalid",
    path: ["identifier"],
  });

export const signupSchema = z
  .object({
    role: signupRoleSchema,
    fullName: z
      .string()
      .trim()
      .min(2, { message: "authValidation.nameRequired" })
      .default(""),
    phone: z
      .string()
      .trim()
      .min(7, { message: "authValidation.phoneRequired" })
      .default(""),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: "authValidation.confirmRequired" }),
    preferredLanguage: z.enum(["uz", "ru", "en"]).default("uz"),
    consent: z.literal(true, {
      errorMap: () => ({ message: "authValidation.consentRequired" }),
    }),
    inviteCode: z.string().trim().max(32).optional(),
    turnstileToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "authValidation.passwordMismatch",
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional(),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: "authValidation.confirmRequired" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "authValidation.passwordMismatch",
  });

export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: "authValidation.totpInvalid" });

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/[^A-Z0-9-]/g, ""))
  .refine((v) => v.replace(/-/g, "").length >= 6 && v.replace(/-/g, "").length <= 16, {
    message: "authValidation.inviteInvalid",
  });

/**
 * Validates and normalizes internal redirect destinations to prevent Open Redirects.
 * Only permits locale-neutral or localized app/onboarding paths.
 */
export function sanitizeRedirectPath(rawPath: string | null | undefined): string | null {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed, "https://internal.local");
    if (parsed.origin !== "https://internal.local") {
      return null;
    }
    const cleanPath = `${parsed.pathname}${parsed.search}`;
    // Strip optional /uz|/ru|/en prefix when checking allowed authenticated targets
    const stripped = cleanPath.replace(/^\/(uz|ru|en)(?=\/|$)/, "") || "/";
    if (
      stripped.startsWith("/app/") ||
      stripped === "/app" ||
      stripped === "/cabinet" ||
      stripped.startsWith("/cabinet/") ||
      stripped === "/personal-info" ||
      stripped.startsWith("/personal-info/") ||
      stripped === "/onboarding" ||
      stripped === "/privacy" ||
      stripped === "/terms"
    ) {
      return stripped;
    }
    return null;
  } catch {
    return null;
  }
}

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
