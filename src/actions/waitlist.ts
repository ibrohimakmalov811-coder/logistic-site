"use server";

import { headers } from "next/headers";
import { waitlistSchema, type WaitlistInput } from "@/lib/validations/waitlist";
import { checkRateLimit } from "@/lib/redis";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { hashIp } from "@/lib/hash";
import { insertWaitlistSubmission } from "@/lib/supabase";
import type { ActionResponse } from "@/types/waitlist";

export async function submitWaitlistAction(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    // 1. Resolve client IP securely
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const cfConnectingIp = headerList.get("cf-connecting-ip");
    const realIp = headerList.get("x-real-ip");
    const clientIp = (cfConnectingIp || forwardedFor?.split(",")[0] || realIp || "127.0.0.1").trim();

    // 2. Rate limiting check (Upstash Redis with dev fallback)
    const rateLimit = await checkRateLimit(clientIp);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "rate_limit_exceeded",
      };
    }

    // 3. Server-side Zod validation
    const validationResult = waitlistSchema.safeParse(rawInput);
    if (!validationResult.success) {
      const fieldErrors: Partial<Record<keyof WaitlistInput, string[]>> = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as keyof WaitlistInput;
        if (path) {
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path]!.push(issue.message);
        }
      }
      return {
        success: false,
        error: "validation_failed",
        fieldErrors,
      };
    }

    const data = validationResult.data;

    // 4. Honeypot check (hidden field for spam bots)
    if (data.hp_company_website && data.hp_company_website.length > 0) {
      console.warn(`[SPAM BLOCKED] Honeypot triggered from IP: ${clientIp}`);
      // Return ambiguous success to confuse automated scrapers/bots
      return {
        success: true,
        message: "success_registered",
      };
    }

    // 5. Cloudflare Turnstile verification
    const turnstileResult = await verifyTurnstileToken(data.turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return {
        success: false,
        error: "turnstile_failed",
      };
    }

    // 6. Anonymized IP hash for privacy
    const ipHash = hashIp(clientIp);

    // 7. Insert to Supabase with duplicate check
    const dbResult = await insertWaitlistSubmission(data, ipHash);

    if (!dbResult.success) {
      if (dbResult.isDuplicate) {
        return {
          success: false,
          error: "duplicate_phone",
        };
      }
      return {
        success: false,
        error: "server_error",
      };
    }

    return {
      success: true,
      message: "success_registered",
    };
  } catch (error) {
    console.error("[Waitlist Action Exception]", error);
    return {
      success: false,
      error: "unexpected_error",
    };
  }
}
