import crypto from "crypto";
import { headers } from "next/headers";
import { hashIp } from "@/lib/hash";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDevSandboxActive } from "@/lib/supabase/config";
import { getDevDb, saveDevDb } from "@/lib/dev-store";
import { env } from "@/env";

export interface AuditEventInput {
  actorId: string | null;
  companyId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Extracts client IP (hashed) and sanitized User-Agent for audit logs and rate limits.
 */
export async function getRequestClientMeta(): Promise<{
  ip: string;
  ipHash: string;
  userAgent: string | null;
}> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  const realIp = hdrs.get("x-real-ip");
  const ip = (forwardedFor?.split(",")[0] ?? realIp ?? "unknown").trim();
  const userAgent = hdrs.get("user-agent")?.slice(0, 250) ?? null;
  return {
    ip,
    ipHash: hashIp(ip),
    userAgent,
  };
}

/**
 * Writes a non-tamperable audit trail entry to `audit_logs` via service_role
 * (or local dev sandbox store when Supabase is not configured in non-prod).
 */
export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  const meta = await getRequestClientMeta();
  const admin = createSupabaseAdminClient();

  if (admin) {
    try {
      await admin.from("audit_logs").insert({
        actor_id: event.actorId,
        company_id: event.companyId ?? null,
        event_type: event.action,
        target_type: event.targetType,
        target_id: event.targetId ?? null,
        metadata: event.metadata ?? {},
        ip_hash: meta.ipHash,
      });
    } catch (err) {
      console.error("[Audit] Failed to record audit log:", err);
    }
    return;
  }

  if (env.NODE_ENV === "production") {
    console.error("[SECURITY] Audit log skipped: Supabase admin client unconfigured in production.");
    return;
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    db.auditLogs.unshift({
      id: crypto.randomUUID(),
      actor_id: event.actorId,
      company_id: event.companyId ?? null,
      event_type: event.action,
      target_type: event.targetType,
      target_id: event.targetId ?? null,
      metadata: event.metadata ?? {},
      ip_hash: meta.ipHash,
      created_at: new Date().toISOString(),
    });
    if (db.auditLogs.length > 500) {
      db.auditLogs.length = 500;
    }
    saveDevDb();
  }
}
