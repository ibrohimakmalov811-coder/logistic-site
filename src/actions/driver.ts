"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/redis";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isDevSandboxActive,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/config";
import { getDevDb, saveDevDb } from "@/lib/dev-store";
import { getRequestClientMeta, recordAuditEvent } from "@/lib/audit";
import { getServerAuthContext, type ServerAuthContext } from "@/lib/auth/session";
import { sanitizeDeliveryImage } from "@/lib/image-sanitize";
import {
  ALLOWED_DRIVER_TRANSITIONS,
  DELIVERY_PROOF_MAX_BYTES,
  deliveryProofMetaSchema,
  driverProfileUpdateSchema,
} from "@/lib/validations/portal";
import type { OrderStatus } from "@/types/database";

export interface DriverActionResult {
  ok: boolean;
  errorCode?: string;
}

async function requireActiveDriver(): Promise<
  { ok: true; ctx: ServerAuthContext } | { ok: false; errorCode: string }
> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };
  if (ctx.role !== "driver") return { ok: false, errorCode: "FORBIDDEN" };
  if (!ctx.membership || !ctx.membership.is_active) {
    return { ok: false, errorCode: "NO_COMPANY" };
  }

  const meta = await getRequestClientMeta();
  const limit = await checkRateLimit(
    ctx.userId || meta.ipHash,
    "portal_mutation"
  );
  if (!limit.success) return { ok: false, errorCode: "RATE_LIMITED" };

  return { ok: true, ctx };
}

export async function advanceDriverOrderStatusAction(
  orderId: string,
  nextStatus: OrderStatus
): Promise<DriverActionResult> {
  const guard = await requireActiveDriver();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  if (nextStatus === "delivered") {
    return { ok: false, errorCode: "PROOF_REQUIRED" };
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, assigned_driver_id, company_id")
      .eq("id", orderId)
      .eq("company_id", companyId)
      .eq("assigned_driver_id", ctx.userId)
      .maybeSingle();

    if (!order) return { ok: false, errorCode: "NOT_FOUND" };

    const allowedNext = ALLOWED_DRIVER_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      return { ok: false, errorCode: "INVALID_TRANSITION" };
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId)
      .eq("company_id", companyId)
      .eq("assigned_driver_id", ctx.userId);

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      company_id: companyId,
      from_status: order.status,
      to_status: nextStatus,
      changed_by: ctx.userId,
    });

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.driver_status_updated",
      targetType: "order",
      targetId: orderId,
      metadata: { from: order.status, to: nextStatus },
    });

    revalidatePath("/[locale]/app/driver", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const order = db.orders.find(
      (o) =>
        o.id === orderId &&
        o.company_id === companyId &&
        o.assigned_driver_id === ctx.userId
    );
    if (!order) return { ok: false, errorCode: "NOT_FOUND" };

    const allowedNext = ALLOWED_DRIVER_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      return { ok: false, errorCode: "INVALID_TRANSITION" };
    }

    const prevStatus = order.status;
    const now = new Date().toISOString();
    order.status = nextStatus;
    order.updated_at = now;

    db.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      company_id: companyId,
      from_status: prevStatus,
      to_status: nextStatus,
      changed_by: ctx.userId,
      note: null,
      created_at: now,
    });

    saveDevDb();
    revalidatePath("/[locale]/app/driver", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function confirmDeliveryAction(
  formData: FormData
): Promise<DriverActionResult> {
  const guard = await requireActiveDriver();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  const orderIdRaw = String(formData.get("orderId") ?? "");
  const noteRaw = String(formData.get("note") ?? "");
  const fileEntry = formData.get("proofPhoto");

  const metaParsed = deliveryProofMetaSchema.safeParse({
    orderId: orderIdRaw,
    note: noteRaw || undefined,
  });
  if (!metaParsed.success) {
    return { ok: false, errorCode: "VALIDATION_ERROR" };
  }

  if (!(fileEntry instanceof File) || fileEntry.size <= 0) {
    return { ok: false, errorCode: "PHOTO_REQUIRED" };
  }

  if (fileEntry.size > DELIVERY_PROOF_MAX_BYTES) {
    return { ok: false, errorCode: "FILE_TOO_LARGE" };
  }

  const rawBytes = Buffer.from(await fileEntry.arrayBuffer());
  const sanitized = await sanitizeDeliveryImage(rawBytes);
  if (!sanitized) {
    return { ok: false, errorCode: "INVALID_IMAGE_FILE" };
  }

  const storagePath = `${companyId}/${metaParsed.data.orderId}/${crypto.randomUUID()}.jpg`;
  const nowIso = new Date().toISOString();

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const reader = admin ?? supabase;
    if (!reader || !admin) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { data: order } = await reader
      .from("orders")
      .select("id, status, assigned_driver_id, company_id")
      .eq("id", metaParsed.data.orderId)
      .eq("company_id", companyId)
      .eq("assigned_driver_id", ctx.userId)
      .maybeSingle();

    if (!order) return { ok: false, errorCode: "NOT_FOUND" };
    if (order.status !== "in_transit") {
      return { ok: false, errorCode: "INVALID_TRANSITION" };
    }

    const { error: uploadErr } = await admin.storage
      .from("delivery-proofs")
      .upload(storagePath, sanitized.cleanBuffer, {
        contentType: sanitized.mimeType,
        upsert: false,
      });

    if (uploadErr) {
      return { ok: false, errorCode: "UPLOAD_FAILED" };
    }

    const { error: proofErr } = await admin.from("delivery_proofs").insert({
      order_id: order.id,
      company_id: companyId,
      driver_id: ctx.userId,
      storage_path: storagePath,
      mime_type: sanitized.mimeType,
      file_size_bytes: sanitized.cleanBuffer.length,
      note: metaParsed.data.note || null,
    });

    if (proofErr) {
      return { ok: false, errorCode: "SAVE_FAILED" };
    }

    await admin
      .from("orders")
      .update({
        status: "delivered",
        delivered_at: nowIso,
      })
      .eq("id", order.id);

    await admin.from("order_status_history").insert({
      order_id: order.id,
      company_id: companyId,
      from_status: order.status,
      to_status: "delivered",
      changed_by: ctx.userId,
      note: metaParsed.data.note || "Delivery confirmed with photo",
    });

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.delivery_confirmed",
      targetType: "delivery_proof",
      targetId: order.id,
      metadata: { sizeBytes: sanitized.cleanBuffer.length },
    });

    revalidatePath("/[locale]/app/driver", "layout");
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const order = db.orders.find(
      (o) =>
        o.id === metaParsed.data.orderId &&
        o.company_id === companyId &&
        o.assigned_driver_id === ctx.userId
    );
    if (!order) return { ok: false, errorCode: "NOT_FOUND" };
    if (order.status !== "in_transit") {
      return { ok: false, errorCode: "INVALID_TRANSITION" };
    }

    db.devProofFiles[storagePath] = {
      mimeType: sanitized.mimeType,
      base64: sanitized.cleanBuffer.toString("base64"),
    };

    db.deliveryProofs.unshift({
      id: crypto.randomUUID(),
      order_id: order.id,
      company_id: companyId,
      driver_id: ctx.userId,
      storage_path: storagePath,
      mime_type: sanitized.mimeType,
      file_size_bytes: sanitized.cleanBuffer.length,
      note: metaParsed.data.note || null,
      created_at: nowIso,
    });

    const prevStatus = order.status;
    order.status = "delivered";
    order.delivered_at = nowIso;
    order.updated_at = nowIso;

    db.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      company_id: companyId,
      from_status: prevStatus,
      to_status: "delivered",
      changed_by: ctx.userId,
      note: metaParsed.data.note || "Delivery confirmed with photo",
      created_at: nowIso,
    });

    saveDevDb();

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.delivery_confirmed",
      targetType: "delivery_proof",
      targetId: order.id,
    });

    revalidatePath("/[locale]/app/driver", "layout");
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function updateDriverProfileAction(
  input: unknown
): Promise<DriverActionResult> {
  const guard = await requireActiveDriver();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;

  const parsed = driverProfileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        preferred_language: parsed.data.preferredLanguage,
      })
      .eq("id", ctx.userId);

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };
    revalidatePath("/[locale]/app/driver", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const profile = db.profiles.find((p) => p.id === ctx.userId);
    const now = new Date().toISOString();

    if (profile) {
      profile.full_name = parsed.data.fullName;
      profile.phone = parsed.data.phone;
      profile.preferred_language = parsed.data.preferredLanguage;
      profile.updated_at = now;
    }
    saveDevDb();
    revalidatePath("/[locale]/app/driver", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}
