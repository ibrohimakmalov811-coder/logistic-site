"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/redis";
import { generateInviteCode, maskInviteCode, sha256Hex } from "@/lib/hash";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isDevSandboxActive,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/config";
import { getDevDb, saveDevDb } from "@/lib/dev-store";
import { getRequestClientMeta, recordAuditEvent } from "@/lib/audit";
import { getServerAuthContext, type ServerAuthContext } from "@/lib/auth/session";
import {
  ALLOWED_MANAGER_TRANSITIONS,
  companySettingsSchema,
  createInviteSchema,
  orderAssignSchema,
  orderFormSchema,
  orderStatusUpdateSchema,
  vehicleFormSchema,
} from "@/lib/validations/portal";
import type { OrderStatus } from "@/types/database";

export interface PortalActionResult {
  ok: boolean;
  errorCode?: string;
  orderId?: string;
  inviteCode?: string;
}

async function requireCompanyManager(): Promise<
  { ok: true; ctx: ServerAuthContext } | { ok: false; errorCode: string }
> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };
  if (ctx.role !== "company_owner" && ctx.role !== "dispatcher") {
    return { ok: false, errorCode: "FORBIDDEN" };
  }
  if (!ctx.membership || !ctx.membership.is_active) {
    return { ok: false, errorCode: "NO_COMPANY" };
  }
  if (!ctx.hasTotpFactor || !ctx.mfaVerified) {
    return { ok: false, errorCode: "MFA_REQUIRED" };
  }

  const meta = await getRequestClientMeta();
  const limit = await checkRateLimit(
    ctx.userId || meta.ipHash,
    "portal_mutation"
  );
  if (!limit.success) {
    return { ok: false, errorCode: "RATE_LIMITED" };
  }

  return { ok: true, ctx };
}

function buildOrderNumber(): string {
  const rnd = crypto.randomInt(1000, 9999);
  const ts = String(Date.now()).slice(-4);
  return `TF-${ts}-${rnd}`;
}

export async function createOrderAction(
  input: unknown
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  const parsed = orderFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorCode: "VALIDATION_ERROR" };
  }

  const d = parsed.data;
  const initialStatus: OrderStatus =
    d.assignedDriverId && d.assignedVehicleId ? "assigned" : "new";
  const orderNumber = buildOrderNumber();

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) return { ok: false, errorCode: "CONFIG_ERROR" };

    // Verify driver/vehicle belong to THIS company (prevents cross-tenant assignment)
    if (d.assignedDriverId) {
      const { data: drvMember } = await client
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", d.assignedDriverId)
        .eq("role", "driver")
        .eq("is_active", true)
        .maybeSingle();
      if (!drvMember) return { ok: false, errorCode: "INVALID_DRIVER" };
    }
    if (d.assignedVehicleId) {
      const { data: veh } = await client
        .from("vehicles")
        .select("id")
        .eq("company_id", companyId)
        .eq("id", d.assignedVehicleId)
        .maybeSingle();
      if (!veh) return { ok: false, errorCode: "INVALID_VEHICLE" };
    }

    const { data: created, error } = await client
      .from("orders")
      .insert({
        company_id: companyId,
        order_number: orderNumber,
        status: initialStatus,
        pickup_address: d.pickupAddress,
        delivery_address: d.deliveryAddress,
        cargo_description: d.cargoDescription,
        weight_kg: d.weightKg,
        deadline_at: new Date(d.deadlineAt).toISOString(),
        customer_name: d.customerName,
        customer_phone: d.customerPhone,
        price_uzs: typeof d.priceUzs === "number" ? d.priceUzs : null,
        delivered_at: null,
        assigned_driver_id: d.assignedDriverId || null,
        assigned_vehicle_id: d.assignedVehicleId || null,
        notes: d.notes || null,
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (error || !created) return { ok: false, errorCode: "SAVE_FAILED" };

    await client.from("order_status_history").insert({
      order_id: created.id,
      company_id: companyId,
      from_status: null,
      to_status: initialStatus,
      changed_by: ctx.userId,
      note: "Order created",
    });

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.created",
      targetType: "order",
      targetId: created.id,
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, orderId: created.id };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    if (d.assignedDriverId) {
      const drvOk = db.companyMembers.some(
        (m) =>
          m.company_id === companyId &&
          m.user_id === d.assignedDriverId &&
          m.role === "driver" &&
          m.is_active
      );
      if (!drvOk) return { ok: false, errorCode: "INVALID_DRIVER" };
    }
    if (d.assignedVehicleId) {
      const vehOk = db.vehicles.some(
        (v) => v.company_id === companyId && v.id === d.assignedVehicleId
      );
      if (!vehOk) return { ok: false, errorCode: "INVALID_VEHICLE" };
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();

    db.orders.unshift({
      id: orderId,
      company_id: companyId,
      order_number: orderNumber,
      status: initialStatus,
      pickup_address: d.pickupAddress,
      delivery_address: d.deliveryAddress,
      cargo_description: d.cargoDescription,
      weight_kg: d.weightKg,
      deadline_at: new Date(d.deadlineAt).toISOString(),
      customer_name: d.customerName,
      customer_phone: d.customerPhone,
      price_uzs: typeof d.priceUzs === "number" ? d.priceUzs : null,
      delivered_at: null,
      assigned_driver_id: d.assignedDriverId || null,
      assigned_vehicle_id: d.assignedVehicleId || null,
      created_by: ctx.userId,
      notes: d.notes || null,
      created_at: now,
      updated_at: now,
    });

    db.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: orderId,
      company_id: companyId,
      from_status: null,
      to_status: initialStatus,
      changed_by: ctx.userId,
      note: "Order created",
      created_at: now,
    });

    saveDevDb();

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.created",
      targetType: "order",
      targetId: orderId,
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, orderId };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function assignOrderAction(
  orderId: string,
  input: unknown
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  const parsed = orderAssignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { data: existing } = await client
      .from("orders")
      .select("id, status, company_id")
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!existing) return { ok: false, errorCode: "NOT_FOUND" };

    const [drvCheck, vehCheck] = await Promise.all([
      client
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", parsed.data.driverId)
        .eq("role", "driver")
        .eq("is_active", true)
        .maybeSingle(),
      client
        .from("vehicles")
        .select("id")
        .eq("company_id", companyId)
        .eq("id", parsed.data.vehicleId)
        .maybeSingle(),
    ]);

    if (!drvCheck.data) return { ok: false, errorCode: "INVALID_DRIVER" };
    if (!vehCheck.data) return { ok: false, errorCode: "INVALID_VEHICLE" };

    const nextStatus: OrderStatus =
      existing.status === "new" ? "assigned" : existing.status;

    const { error } = await client
      .from("orders")
      .update({
        assigned_driver_id: parsed.data.driverId,
        assigned_vehicle_id: parsed.data.vehicleId,
        status: nextStatus,
      })
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    if (nextStatus !== existing.status) {
      await client.from("order_status_history").insert({
        order_id: orderId,
        company_id: companyId,
        from_status: existing.status,
        to_status: nextStatus,
        changed_by: ctx.userId,
        note: "Assigned driver and vehicle",
      });
    }

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.assigned",
      targetType: "order",
      targetId: orderId,
      metadata: {
        driverId: parsed.data.driverId,
        vehicleId: parsed.data.vehicleId,
      },
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, orderId };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const order = db.orders.find(
      (o) => o.id === orderId && o.company_id === companyId
    );
    if (!order) return { ok: false, errorCode: "NOT_FOUND" };

    const drvOk = db.companyMembers.some(
      (m) =>
        m.company_id === companyId &&
        m.user_id === parsed.data.driverId &&
        m.role === "driver" &&
        m.is_active
    );
    const vehOk = db.vehicles.some(
      (v) => v.company_id === companyId && v.id === parsed.data.vehicleId
    );
    if (!drvOk) return { ok: false, errorCode: "INVALID_DRIVER" };
    if (!vehOk) return { ok: false, errorCode: "INVALID_VEHICLE" };

    const prevStatus = order.status;
    const nextStatus: OrderStatus = prevStatus === "new" ? "assigned" : prevStatus;
    const now = new Date().toISOString();

    order.assigned_driver_id = parsed.data.driverId;
    order.assigned_vehicle_id = parsed.data.vehicleId;
    order.status = nextStatus;
    order.updated_at = now;

    if (nextStatus !== prevStatus) {
      db.orderStatusHistory.push({
        id: crypto.randomUUID(),
        order_id: order.id,
        company_id: companyId,
        from_status: prevStatus,
        to_status: nextStatus,
        changed_by: ctx.userId,
        note: "Assigned driver and vehicle",
        created_at: now,
      });
    }

    saveDevDb();

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.assigned",
      targetType: "order",
      targetId: orderId,
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, orderId };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function updateOrderStatusManagerAction(
  orderId: string,
  input: unknown
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  const parsed = orderStatusUpdateSchema.safeParse({
    orderId,
    ...(typeof input === "object" && input !== null ? input : {}),
  });
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  const targetStatus = parsed.data.nextStatus;

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { data: order } = await client
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!order) return { ok: false, errorCode: "NOT_FOUND" };

    const allowed = ALLOWED_MANAGER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      return { ok: false, errorCode: "INVALID_TRANSITION" };
    }

    const { error } = await client
      .from("orders")
      .update({
        status: targetStatus,
        delivered_at:
          targetStatus === "delivered" ? new Date().toISOString() : undefined,
      })
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    await client.from("order_status_history").insert({
      order_id: orderId,
      company_id: companyId,
      from_status: order.status,
      to_status: targetStatus,
      changed_by: ctx.userId,
      note: parsed.data.note || null,
    });

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "order.status_updated",
      targetType: "order",
      targetId: orderId,
      metadata: { from: order.status, to: targetStatus },
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, orderId };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const order = db.orders.find(
      (o) => o.id === orderId && o.company_id === companyId
    );
    if (!order) return { ok: false, errorCode: "NOT_FOUND" };

    const allowed = ALLOWED_MANAGER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      return { ok: false, errorCode: "INVALID_TRANSITION" };
    }

    const prevStatus = order.status;
    const now = new Date().toISOString();
    order.status = targetStatus;
    if (targetStatus === "delivered") {
      order.delivered_at = now;
    }
    order.updated_at = now;

    db.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      company_id: companyId,
      from_status: prevStatus,
      to_status: targetStatus,
      changed_by: ctx.userId,
      note: parsed.data.note || null,
      created_at: now,
    });

    saveDevDb();
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, orderId };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function createVehicleAction(
  input: unknown
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  const parsed = vehicleFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await client.from("vehicles").insert({
      company_id: companyId,
      plate_number: parsed.data.plateNumber,
      vehicle_type: parsed.data.vehicleType,
      capacity_kg: parsed.data.capacityKg,
      region: parsed.data.region,
      status: parsed.data.status,
    });

    if (error) {
      return {
        ok: false,
        errorCode:
          error.code === "23505" ? "DUPLICATE_PLATE" : "SAVE_FAILED",
      };
    }

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "vehicle.created",
      targetType: "vehicle",
      metadata: { plate: parsed.data.plateNumber },
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const dup = db.vehicles.some(
      (v) =>
        v.company_id === companyId &&
        v.plate_number.toUpperCase() === parsed.data.plateNumber.toUpperCase()
    );
    if (dup) return { ok: false, errorCode: "DUPLICATE_PLATE" };

    const now = new Date().toISOString();
    db.vehicles.unshift({
      id: crypto.randomUUID(),
      company_id: companyId,
      plate_number: parsed.data.plateNumber.toUpperCase(),
      vehicle_type: parsed.data.vehicleType,
      capacity_kg: parsed.data.capacityKg,
      region: parsed.data.region,
      status: parsed.data.status,
      created_at: now,
      updated_at: now,
    });
    saveDevDb();
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function deleteVehicleAction(
  vehicleId: string
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await client
      .from("vehicles")
      .delete()
      .eq("id", vehicleId)
      .eq("company_id", companyId);
    if (error) return { ok: false, errorCode: "DELETE_FAILED" };
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    db.vehicles = db.vehicles.filter(
      (v) => !(v.id === vehicleId && v.company_id === companyId)
    );
    saveDevDb();
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function createInviteAction(
  input: unknown
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  // Only company_owner can invite dispatchers
  if (parsed.data.role === "dispatcher" && ctx.role !== "company_owner") {
    return { ok: false, errorCode: "FORBIDDEN" };
  }

  const rawCode = generateInviteCode();
  const codeHash = sha256Hex(rawCode);
  const codeHint = maskInviteCode(rawCode);
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * parsed.data.expiresInDays
  ).toISOString();

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await admin.from("invites").insert({
      company_id: companyId,
      role: parsed.data.role,
      code_hash: codeHash,
      code_hint: codeHint,
      invited_email: parsed.data.invitedEmail || null,
      created_by: ctx.userId,
      expires_at: expiresAt,
    });

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "invite.created",
      targetType: "invite",
      metadata: { role: parsed.data.role },
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, inviteCode: rawCode };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    db.invites.unshift({
      id: crypto.randomUUID(),
      company_id: companyId,
      role: parsed.data.role,
      code_hash: codeHash,
      code_hint: codeHint,
      invited_email: parsed.data.invitedEmail || null,
      created_by: ctx.userId,
      used_by: null,
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date().toISOString(),
    });
    saveDevDb();

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "invite.created",
      targetType: "invite",
      metadata: { role: parsed.data.role },
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true, inviteCode: rawCode };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function revokeInviteAction(
  inviteId: string
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await client
      .from("invites")
      .delete()
      .eq("id", inviteId)
      .eq("company_id", companyId)
      .is("used_at", null);
    if (error) return { ok: false, errorCode: "SAVE_FAILED" };
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    db.invites = db.invites.filter(
      (i) => !(i.id === inviteId && i.company_id === companyId && !i.used_at)
    );
    saveDevDb();
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function toggleMemberActiveAction(
  targetUserId: string,
  nextActive: boolean
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;
  const companyId = ctx.membership!.company_id;

  if (targetUserId === ctx.userId) {
    return { ok: false, errorCode: "CANNOT_DEACTIVATE_SELF" };
  }

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { data: targetMember } = await admin
      .from("company_members")
      .select("id, role")
      .eq("company_id", companyId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!targetMember) return { ok: false, errorCode: "NOT_FOUND" };
    if (targetMember.role !== "driver" && ctx.role !== "company_owner") {
      return { ok: false, errorCode: "FORBIDDEN" };
    }

    const { error } = await admin
      .from("company_members")
      .update({ is_active: nextActive })
      .eq("id", targetMember.id);
    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: nextActive ? "member.activated" : "member.deactivated",
      targetType: "company_member",
      targetId: targetUserId,
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const member = db.companyMembers.find(
      (m) => m.company_id === companyId && m.user_id === targetUserId
    );
    if (!member) return { ok: false, errorCode: "NOT_FOUND" };
    if (member.role !== "driver" && ctx.role !== "company_owner") {
      return { ok: false, errorCode: "FORBIDDEN" };
    }

    member.is_active = nextActive;
    saveDevDb();
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function updateCompanySettingsAction(
  input: unknown
): Promise<PortalActionResult> {
  const guard = await requireCompanyManager();
  if (!guard.ok) return { ok: false, errorCode: guard.errorCode };
  const { ctx } = guard;

  if (ctx.role !== "company_owner") {
    return { ok: false, errorCode: "FORBIDDEN" };
  }

  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  const companyId = ctx.membership!.company_id;

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await client
      .from("companies")
      .update({
        name: parsed.data.name,
        legal_form: parsed.data.legalForm,
        city_region: parsed.data.cityRegion,
        fleet_size: parsed.data.fleetSize,
      })
      .eq("id", companyId);
    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "company.updated",
      targetType: "company",
      targetId: companyId,
    });

    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const company = db.companies.find((c) => c.id === companyId);
    if (!company) return { ok: false, errorCode: "NOT_FOUND" };
    company.name = parsed.data.name;
    company.legal_form = parsed.data.legalForm;
    company.city_region = parsed.data.cityRegion;
    company.fleet_size = parsed.data.fleetSize;
    company.updated_at = new Date().toISOString();
    saveDevDb();
    revalidatePath("/[locale]/app/company", "layout");
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}
