import { env } from "@/env";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Validates Cloudflare Turnstile token on the server side.
 * Never trust client-side validation alone.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // If in development and token is missing or test key is used
  if (env.NODE_ENV === "development" && (!token || token === "test-token" || token.startsWith("XXXX."))) {
    console.warn("[DEV FALLBACK] Turnstile verification bypassed with test token in development.");
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Turnstile token is required." };
  }

  const secretKey = env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    if (env.NODE_ENV === "production") {
      console.error("[SECURITY ALERT] TURNSTILE_SECRET_KEY is missing in production!");
      return { success: false, error: "Server security configuration error." };
    }
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = (await res.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      console.warn(
        `[Turnstile Failed] Error codes: ${data["error-codes"]?.join(", ") || "unknown"}`
      );
      return {
        success: false,
        error: "Bot verification failed. Please refresh and try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[Turnstile Exception] Verification request failed:", error);
    // In production fail closed
    if (env.NODE_ENV === "production") {
      return {
        success: false,
        error: "Bot verification service temporarily unavailable.",
      };
    }
    return { success: true };
  }
}
