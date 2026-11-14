import { z } from "zod";

/**
 * Normalizes phone numbers to standard E.164 Uzbekistan format: +998XXXXXXXXX
 */
export function normalizeUzPhone(rawPhone: string): string {
  // Strip whitespace, hyphens, brackets
  const cleaned = rawPhone.replace(/[\s\-()]/g, "");
  
  if (cleaned.startsWith("+998")) {
    return cleaned;
  }
  if (cleaned.startsWith("998")) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("8")) {
    // legacy format like 8 90 123 45 67 -> +998901234567
    return `+998${cleaned.slice(1)}`;
  }
  if (/^\d{9}$/.test(cleaned)) {
    return `+998${cleaned}`;
  }
  return cleaned;
}

/**
 * Validates Uzbekistan mobile and landline operator prefixes:
 * 20, 33, 55, 71, 77, 88, 90, 91, 93, 94, 95, 97, 98, 99
 */
export const UZ_PHONE_REGEX = /^\+998(20|33|55|71|77|88|90|91|93|94|95|97|98|99)\d{7}$/;

export const waitlistSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "validation.nameTooShort" })
    .max(100, { message: "validation.nameTooLong" })
    .regex(/^[a-zA-Z\u0400-\u04FF\s'`ʻʼ-]+$/, {
      message: "validation.nameInvalidChars",
    }),
  phone: z
    .string()
    .trim()
    .min(9, { message: "validation.phoneRequired" })
    .transform(normalizeUzPhone)
    .refine((val) => UZ_PHONE_REGEX.test(val), {
      message: "validation.phoneInvalidUz",
    }),
  companyName: z
    .string()
    .trim()
    .min(2, { message: "validation.companyTooShort" })
    .max(120, { message: "validation.companyTooLong" }),
  role: z.enum(["owner", "dispatcher", "driver", "other"], {
    errorMap: () => ({ message: "validation.roleRequired" }),
  }),
  fleetSize: z.enum(["1-4", "5-15", "16-30", "30+"], {
    errorMap: () => ({ message: "validation.fleetRequired" }),
  }),
  preferredLanguage: z.enum(["uz", "ru", "en"], {
    errorMap: () => ({ message: "validation.langRequired" }),
  }),
  consent: z.literal(true, {
    errorMap: () => ({ message: "validation.consentRequired" }),
  }),
  turnstileToken: z.string().optional(),
  // Honeypot field (hidden from real users, filled only by bots)
  hp_company_website: z.string().max(0, { message: "bot_detected" }).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
