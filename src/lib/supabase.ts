import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { WaitlistRecord } from "@/types/waitlist";
import type { WaitlistInput } from "@/lib/validations/waitlist";

/**
 * Local in-memory store for development testing only.
 * STAYS EMPTY IN PRODUCTION.
 */
const devWaitlistStore = new Map<string, WaitlistRecord>();

export function getSupabaseClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key on server if available; otherwise anon key
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function insertWaitlistSubmission(
  data: WaitlistInput,
  ipHash: string
): Promise<{ success: boolean; isDuplicate?: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const allowDevFallback = process.env.ALLOW_DEV_WAITLIST_FALLBACK === "true";
    if (process.env.NODE_ENV === "development" && allowDevFallback) {
      // DEVELOPMENT FALLBACK ONLY WHEN EXPLICITLY ENABLED
      console.warn(
        `[DEV FALLBACK] Supabase not connected. Storing waitlist entry in local memory for phone: ${data.phone}`
      );

      if (devWaitlistStore.has(data.phone)) {
        return {
          success: false,
          isDuplicate: true,
          error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan.",
        };
      }

      const record: WaitlistRecord = {
        id: `dev-${Date.now()}`,
        fullName: data.fullName,
        phone: data.phone,
        companyName: data.companyName,
        role: data.role,
        fleetSize: data.fleetSize,
        preferredLanguage: data.preferredLanguage,
        consent: data.consent,
        createdAt: new Date().toISOString(),
        ipAddressHash: ipHash,
      };

      devWaitlistStore.set(data.phone, record);
      return { success: true };
    }

    console.warn("[Waitlist] Database connection is not configured or unavailable.");
    return {
      success: false,
      error: "database_unavailable",
    };
  }

  try {
    const { error } = await supabase.from("waitlist").insert([
      {
        full_name: data.fullName,
        phone: data.phone,
        company_name: data.companyName,
        role: data.role,
        fleet_size: data.fleetSize,
        preferred_language: data.preferredLanguage,
        consent: data.consent,
        ip_hash: ipHash,
      },
    ]);

    if (error) {
      // Postgres unique constraint violation code is 23505
      if (error.code === "23505" || error.message.includes("unique")) {
        return {
          success: false,
          isDuplicate: true,
          error: "Bu telefon raqami allaqachon kutish ro'yxatiga kiritilgan.",
        };
      }

      console.error("[Database Error] Supabase insert failed:", error.message);
      return {
        success: false,
        error: "Ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[Database Exception] Unexpected database error:", err);
    return {
      success: false,
      error: "Kutilmagan server xatoligi yuz berdi.",
    };
  }
}
