"use server";

import crypto from "crypto";
import { env } from "@/env";
import { checkRateLimit } from "@/lib/redis";
import { sha256Hex } from "@/lib/hash";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isDevSandboxActive,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/config";
import { getDevDb, normalizeLocale, saveDevDb } from "@/lib/dev-store";
import { getRequestClientMeta, recordAuditEvent } from "@/lib/audit";
import {
  getRoleDestinationPath,
  getServerAuthContext,
  setDevSessionCookie,
} from "@/lib/auth/session";
import {
  driverDetailsStepSchema,
  onboardingDraftSchema,
  ownerCompanyStepSchema,
  personalInfoSchema,
  type OnboardingDraftInput,
} from "@/lib/validations/onboarding";
import { inviteCodeSchema } from "@/lib/validations/auth";
import type {
  AppLocale,
  FleetSize,
  LegalForm,
  LicenseCategory,
  VehicleType,
} from "@/types/database";

export interface OnboardingActionResult {
  ok: boolean;
  errorCode?: string;
  redirectTo?: string;
  companyName?: string;
  companyId?: string;
}

export async function getOnboardingDraft(): Promise<OnboardingDraftInput> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { step: 1 };

  const parsedFromProfile = onboardingDraftSchema.safeParse(
    ctx.profile.onboarding_draft
  );
  if (parsedFromProfile.success) {
    return {
      ...parsedFromProfile.data,
      fullName: parsedFromProfile.data.fullName || ctx.profile.full_name || "",
      phone: parsedFromProfile.data.phone || ctx.profile.phone || "",
      preferredLanguage:
        parsedFromProfile.data.preferredLanguage || ctx.profile.preferred_language,
    };
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const parsedMeta = onboardingDraftSchema.safeParse(
        user?.user_metadata?.onboarding_draft
      );
      if (parsedMeta.success) {
        return {
          ...parsedMeta.data,
          fullName: parsedMeta.data.fullName || ctx.profile.full_name || "",
          phone: parsedMeta.data.phone || ctx.profile.phone || "",
          preferredLanguage:
            parsedMeta.data.preferredLanguage || ctx.profile.preferred_language,
        };
      }
    }
  } else if (isDevSandboxActive()) {
    const db = getDevDb();
    const user = db.users.find((u) => u.id === ctx.userId);
    if (user?.onboardingDraft) {
      return {
        ...user.onboardingDraft,
        fullName: user.onboardingDraft.fullName || ctx.profile.full_name || "",
        phone: user.onboardingDraft.phone || ctx.profile.phone || "",
        preferredLanguage:
          user.onboardingDraft.preferredLanguage ||
          ctx.profile.preferred_language,
      };
    }
  }

  return {
    step: ctx.membership ? 3 : ctx.profile.full_name ? 2 : 1,
    fullName: ctx.profile.full_name || "",
    phone: ctx.profile.phone || "",
    preferredLanguage: ctx.profile.preferred_language,
  };
}

export async function saveOnboardingDraftAction(
  draft: OnboardingDraftInput
): Promise<OnboardingActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };

  const parsed = onboardingDraftSchema.safeParse(draft);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };
    await supabase
      .from("profiles")
      .update({ onboarding_draft: parsed.data })
      .eq("id", ctx.userId);
    await supabase.auth.updateUser({
      data: { onboarding_draft: parsed.data },
    });
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const profile = db.profiles.find((p) => p.id === ctx.userId);
    const user = db.users.find((u) => u.id === ctx.userId);
    if (profile) {
      profile.onboarding_draft = parsed.data;
      profile.updated_at = new Date().toISOString();
    }
    if (user) {
      user.onboardingDraft = parsed.data;
    }
    saveDevDb();
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function savePersonalInfoAction(input: {
  fullName: string;
  phone: string;
  preferredLanguage: AppLocale;
}): Promise<OnboardingActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };

  const parsed = personalInfoSchema.safeParse({
    fullName: input.fullName,
    phone: input.phone,
    preferredLanguage: normalizeLocale(input.preferredLanguage),
  });
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  const draft: OnboardingDraftInput = {
    step: 2,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    preferredLanguage: parsed.data.preferredLanguage,
  };

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        preferred_language: parsed.data.preferredLanguage,
        onboarding_draft: draft,
      })
      .eq("id", ctx.userId);

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    await supabase.auth.updateUser({
      data: { onboarding_draft: draft },
    });
    return { ok: true };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const profile = db.profiles.find((p) => p.id === ctx.userId);
    const user = db.users.find((u) => u.id === ctx.userId);
    if (!profile || !user) return { ok: false, errorCode: "UNAUTHORIZED" };

    profile.full_name = parsed.data.fullName;
    profile.phone = parsed.data.phone;
    profile.preferred_language = parsed.data.preferredLanguage;
    profile.onboarding_draft = draft;
    profile.updated_at = new Date().toISOString();
    user.onboardingDraft = {
      ...(user.onboardingDraft ?? {}),
      ...draft,
    };
    saveDevDb();
    return { ok: true };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function completeOwnerCompanyStepAction(input: {
  companyName: string;
  legalForm: LegalForm;
  cityRegion: string;
  fleetSize: FleetSize;
  mainCargoTypes?: string | string[];
}): Promise<OnboardingActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };
  if (ctx.role !== "company_owner") {
    return { ok: false, errorCode: "FORBIDDEN" };
  }

  const parsed = ownerCompanyStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  const cargoList = parsed.data.mainCargoTypes ?? [];

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) return { ok: false, errorCode: "CONFIG_ERROR" };

    if (ctx.membership && ctx.company) {
      const { error: updErr } = await admin
        .from("companies")
        .update({
          name: parsed.data.companyName,
          legal_form: parsed.data.legalForm,
          city_region: parsed.data.cityRegion,
          fleet_size: parsed.data.fleetSize,
          main_cargo_types: cargoList,
        })
        .eq("id", ctx.company.id);

      if (updErr) return { ok: false, errorCode: "SAVE_FAILED" };
      return {
        ok: true,
        companyId: ctx.company.id,
        companyName: parsed.data.companyName,
      };
    }

    const { data: createdCompany, error: compErr } = await admin
      .from("companies")
      .insert({
        owner_id: ctx.userId,
        name: parsed.data.companyName,
        legal_form: parsed.data.legalForm,
        city_region: parsed.data.cityRegion,
        fleet_size: parsed.data.fleetSize,
        main_cargo_types: cargoList,
      })
      .select("id, name")
      .single();

    if (compErr || !createdCompany) {
      return { ok: false, errorCode: "SAVE_FAILED" };
    }

    const { error: memberErr } = await admin.from("company_members").insert({
      company_id: createdCompany.id,
      user_id: ctx.userId,
      role: "company_owner",
      is_active: true,
    });

    if (memberErr) {
      return { ok: false, errorCode: "SAVE_FAILED" };
    }

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: createdCompany.id,
      action: "company.created",
      targetType: "company",
      targetId: createdCompany.id,
    });

    return {
      ok: true,
      companyId: createdCompany.id,
      companyName: createdCompany.name,
    };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const now = new Date().toISOString();

    if (ctx.company) {
      const existing = db.companies.find((c) => c.id === ctx.company!.id);
      if (existing) {
        existing.name = parsed.data.companyName;
        existing.legal_form = parsed.data.legalForm;
        existing.city_region = parsed.data.cityRegion;
        existing.fleet_size = parsed.data.fleetSize;
        existing.main_cargo_types = cargoList;
        existing.updated_at = now;
        saveDevDb();
        return {
          ok: true,
          companyId: existing.id,
          companyName: existing.name,
        };
      }
    }

    const companyId = crypto.randomUUID();
    db.companies.push({
      id: companyId,
      owner_id: ctx.userId,
      name: parsed.data.companyName,
      legal_form: parsed.data.legalForm,
      city_region: parsed.data.cityRegion,
      fleet_size: parsed.data.fleetSize,
      main_cargo_types: cargoList,
      created_at: now,
      updated_at: now,
    });

    db.companyMembers.push({
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: ctx.userId,
      role: "company_owner",
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const user = db.users.find((u) => u.id === ctx.userId);
    if (user) {
      user.onboardingDraft = {
        ...(user.onboardingDraft ?? {}),
        step: 3,
        companyName: parsed.data.companyName,
        legalForm: parsed.data.legalForm,
        cityRegion: parsed.data.cityRegion,
        fleetSize: parsed.data.fleetSize,
        mainCargoTypes: parsed.data.mainCargoTypes,
      };
    }

    saveDevDb();

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId,
      action: "company.created",
      targetType: "company",
      targetId: companyId,
    });

    return {
      ok: true,
      companyId,
      companyName: parsed.data.companyName,
    };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function redeemInviteCodeAction(input: {
  inviteCode: string;
}): Promise<OnboardingActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };
  if (ctx.role !== "dispatcher" && ctx.role !== "driver") {
    return { ok: false, errorCode: "FORBIDDEN" };
  }

  const parsed = inviteCodeSchema.safeParse(input.inviteCode);
  if (!parsed.success) return { ok: false, errorCode: "INVALID_INVITE" };

  const meta = await getRequestClientMeta();
  const limit = await checkRateLimit(ctx.userId || meta.ipHash, "invite_redeem");
  if (!limit.success) return { ok: false, errorCode: "RATE_LIMITED" };

  const codeHash = sha256Hex(parsed.data);
  const nowIso = new Date().toISOString();

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { data: invite } = await admin
      .from("invites")
      .select("*")
      .eq("code_hash", codeHash)
      .eq("role", ctx.role)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (!invite) {
      return { ok: false, errorCode: "INVALID_INVITE" };
    }

    // Atomic single-use redemption: update WHERE used_at IS NULL
    const { data: claimed, error: claimErr } = await admin
      .from("invites")
      .update({
        used_by: ctx.userId,
        used_at: nowIso,
      })
      .eq("id", invite.id)
      .is("used_at", null)
      .select("id, company_id")
      .maybeSingle();

    if (claimErr || !claimed) {
      return { ok: false, errorCode: "INVALID_INVITE" };
    }

    const { error: memErr } = await admin.from("company_members").upsert(
      {
        company_id: claimed.company_id,
        user_id: ctx.userId,
        role: ctx.role,
        is_active: true,
      },
      { onConflict: "company_id,user_id" }
    );

    if (memErr) {
      return { ok: false, errorCode: "SAVE_FAILED" };
    }

    const { data: company } = await admin
      .from("companies")
      .select("id, name")
      .eq("id", claimed.company_id)
      .single();

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: claimed.company_id,
      action: "invite.redeemed",
      targetType: "invite",
      targetId: claimed.id,
      metadata: { role: ctx.role },
    });

    return {
      ok: true,
      companyId: claimed.company_id,
      companyName: company?.name,
    };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const invite = db.invites.find(
      (i) =>
        i.code_hash === codeHash &&
        i.role === ctx.role &&
        !i.used_at &&
        new Date(i.expires_at).getTime() > Date.now()
    );

    if (!invite) {
      return { ok: false, errorCode: "INVALID_INVITE" };
    }

    invite.used_by = ctx.userId;
    invite.used_at = nowIso;

    const alreadyMember = db.companyMembers.find(
      (m) => m.company_id === invite.company_id && m.user_id === ctx.userId
    );
    if (alreadyMember) {
      alreadyMember.is_active = true;
      alreadyMember.role = ctx.role;
      alreadyMember.updated_at = nowIso;
    } else {
      db.companyMembers.push({
        id: crypto.randomUUID(),
        company_id: invite.company_id,
        user_id: ctx.userId,
        role: ctx.role,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    const company = db.companies.find((c) => c.id === invite.company_id);
    const user = db.users.find((u) => u.id === ctx.userId);
    if (user) {
      user.onboardingDraft = {
        ...(user.onboardingDraft ?? {}),
        step: 3,
      };
    }

    saveDevDb();

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: invite.company_id,
      action: "invite.redeemed",
      targetType: "invite",
      targetId: invite.id,
      metadata: { role: ctx.role },
    });

    return {
      ok: true,
      companyId: invite.company_id,
      companyName: company?.name,
    };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function saveDriverDetailsStepAction(input: {
  inviteCode?: string;
  licenseCategory: LicenseCategory;
  yearsExperience: number;
  vehicleType: VehicleType;
  plateNumber: string;
  capacityKg: number;
  vehicleRegion: string;
}): Promise<OnboardingActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };
  if (ctx.role !== "driver") return { ok: false, errorCode: "FORBIDDEN" };

  let companyId = ctx.membership?.company_id;
  let companyName = ctx.company?.name;

  // Allow redeeming invite code either beforehand or as part of step 2 submission
  if (!companyId) {
    if (!input.inviteCode) {
      return { ok: false, errorCode: "INVITE_REQUIRED" };
    }
    const redeemed = await redeemInviteCodeAction({
      inviteCode: input.inviteCode,
    });
    if (!redeemed.ok || !redeemed.companyId) {
      return redeemed;
    }
    companyId = redeemed.companyId;
    companyName = redeemed.companyName;
  }

  const parsed = driverDetailsStepSchema.safeParse({
    inviteCode: input.inviteCode || "ALREADY0",
    licenseCategory: input.licenseCategory,
    yearsExperience: input.yearsExperience,
    vehicleType: input.vehicleType,
    plateNumber: input.plateNumber,
    capacityKg: input.capacityKg,
    vehicleRegion: input.vehicleRegion,
  });

  if (!parsed.success) return { ok: false, errorCode: "VALIDATION_ERROR" };

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) return { ok: false, errorCode: "CONFIG_ERROR" };

    // Upsert driver's own vehicle (by company + normalized plate number)
    const { data: existingVehicle } = await admin
      .from("vehicles")
      .select("id")
      .eq("company_id", companyId)
      .eq("plate_number", parsed.data.plateNumber)
      .maybeSingle();

    let vehicleId = existingVehicle?.id ?? null;
    if (vehicleId) {
      await admin
        .from("vehicles")
        .update({
          vehicle_type: parsed.data.vehicleType,
          capacity_kg: parsed.data.capacityKg,
          region: parsed.data.vehicleRegion,
        })
        .eq("id", vehicleId);
    } else {
      const { data: createdVeh, error: vehErr } = await admin
        .from("vehicles")
        .insert({
          company_id: companyId,
          vehicle_type: parsed.data.vehicleType,
          plate_number: parsed.data.plateNumber,
          capacity_kg: parsed.data.capacityKg,
          region: parsed.data.vehicleRegion,
          status: "available",
        })
        .select("id")
        .single();
      if (vehErr) return { ok: false, errorCode: "SAVE_FAILED" };
      vehicleId = createdVeh.id;
    }

    const { error } = await admin.from("driver_profiles").upsert(
      {
        user_id: ctx.userId,
        company_id: companyId,
        license_category: parsed.data.licenseCategory,
        years_experience: parsed.data.yearsExperience,
        primary_vehicle_id: vehicleId,
        is_active: true,
      },
      { onConflict: "user_id" }
    );

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };
    return { ok: true, companyId, companyName };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const now = new Date().toISOString();

    let vehicle = db.vehicles.find(
      (v) =>
        v.company_id === companyId &&
        v.plate_number === parsed.data.plateNumber
    );
    if (vehicle) {
      vehicle.vehicle_type = parsed.data.vehicleType;
      vehicle.capacity_kg = parsed.data.capacityKg;
      vehicle.region = parsed.data.vehicleRegion;
      vehicle.updated_at = now;
    } else {
      vehicle = {
        id: crypto.randomUUID(),
        company_id: companyId,
        vehicle_type: parsed.data.vehicleType,
        plate_number: parsed.data.plateNumber,
        capacity_kg: parsed.data.capacityKg,
        region: parsed.data.vehicleRegion,
        status: "available",
        created_at: now,
        updated_at: now,
      };
      db.vehicles.push(vehicle);
    }

    const existing = db.driverProfiles.find(
      (dp) => dp.user_id === ctx.userId
    );
    if (existing) {
      existing.company_id = companyId;
      existing.license_category = parsed.data.licenseCategory;
      existing.years_experience = parsed.data.yearsExperience;
      existing.primary_vehicle_id = vehicle.id;
      existing.updated_at = now;
    } else {
      db.driverProfiles.push({
        user_id: ctx.userId,
        company_id: companyId,
        license_category: parsed.data.licenseCategory,
        years_experience: parsed.data.yearsExperience,
        primary_vehicle_id: vehicle.id,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    saveDevDb();
    return { ok: true, companyId, companyName };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}

export async function finishOnboardingAction(
  localeInput: string
): Promise<OnboardingActionResult> {
  const ctx = await getServerAuthContext();
  if (!ctx) return { ok: false, errorCode: "UNAUTHORIZED" };

  const locale: AppLocale = normalizeLocale(localeInput);

  if (!ctx.profile.full_name || !ctx.profile.phone) {
    return { ok: false, errorCode: "PROFILE_INCOMPLETE" };
  }

  if (!ctx.membership) {
    return { ok: false, errorCode: "COMPANY_MEMBERSHIP_REQUIRED" };
  }

  const requiresMfa =
    ctx.role === "company_owner" || ctx.role === "dispatcher";
  if (requiresMfa && (!ctx.hasTotpFactor || !ctx.mfaVerified)) {
    return { ok: false, errorCode: "MFA_REQUIRED" };
  }

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) return { ok: false, errorCode: "CONFIG_ERROR" };

    const { error } = await admin
      .from("profiles")
      .update({
        onboarding_completed: true,
        preferred_language: locale,
        onboarding_draft: null,
      })
      .eq("id", ctx.userId);

    if (error) return { ok: false, errorCode: "SAVE_FAILED" };

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: ctx.membership.company_id,
      action: "onboarding.completed",
      targetType: "profile",
      targetId: ctx.userId,
      metadata: { role: ctx.role },
    });

    return {
      ok: true,
      redirectTo: `/${locale}${getRoleDestinationPath(ctx.role, true)}`,
    };
  }

  if (isDevSandboxActive() && env.NODE_ENV !== "production") {
    const db = getDevDb();
    const profile = db.profiles.find((p) => p.id === ctx.userId);
    const user = db.users.find((u) => u.id === ctx.userId);
    if (!profile || !user) return { ok: false, errorCode: "UNAUTHORIZED" };

    profile.onboarding_completed = true;
    profile.preferred_language = locale;
    profile.onboarding_draft = null;
    profile.updated_at = new Date().toISOString();
    user.onboardingDraft = null;
    saveDevDb();

    await setDevSessionCookie({
      sid: crypto.randomUUID(),
      uid: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      onboardingCompleted: true,
      aal: ctx.aal,
      hasMfa: ctx.hasTotpFactor,
      lastAuthAt: ctx.lastAuthAt,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    await recordAuditEvent({
      actorId: ctx.userId,
      companyId: ctx.membership.company_id,
      action: "onboarding.completed",
      targetType: "profile",
      targetId: ctx.userId,
      metadata: { role: ctx.role },
    });

    return {
      ok: true,
      redirectTo: `/${locale}${getRoleDestinationPath(ctx.role, true)}`,
    };
  }

  return { ok: false, errorCode: "CONFIG_ERROR" };
}
