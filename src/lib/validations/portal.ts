import { z } from "zod";
import { normalizeUzPhone, UZ_PHONE_REGEX } from "./waitlist";
import type { OrderStatus } from "@/types/database";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "new",
  "assigned",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

/**
 * Allowed status transitions enforced consistently on client UI, server actions, and DB triggers.
 */
export const ALLOWED_MANAGER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["assigned", "cancelled"],
  assigned: ["in_transit", "cancelled", "new"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["new"],
};

export const ALLOWED_DRIVER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: [],
  assigned: ["in_transit"],
  in_transit: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const orderFormSchema = z.object({
  id: z.string().uuid().optional(),
  pickupAddress: z
    .string()
    .trim()
    .min(3, { message: "portalValidation.addressTooShort" })
    .max(250, { message: "portalValidation.addressTooLong" }),
  deliveryAddress: z
    .string()
    .trim()
    .min(3, { message: "portalValidation.addressTooShort" })
    .max(250, { message: "portalValidation.addressTooLong" }),
  cargoDescription: z
    .string()
    .trim()
    .min(2, { message: "portalValidation.cargoTooShort" })
    .max(300, { message: "portalValidation.cargoTooLong" }),
  weightKg: z.coerce
    .number()
    .int()
    .min(1, { message: "portalValidation.weightRange" })
    .max(100000, { message: "portalValidation.weightRange" }),
  priceUzs: z.union([
    z.literal(""),
    z.coerce
      .number()
      .int()
      .min(0, { message: "portalValidation.priceInvalid" })
      .max(5000000000, { message: "portalValidation.priceInvalid" }),
  ]).optional(),
  deadlineAt: z
    .string()
    .trim()
    .min(1, { message: "portalValidation.deadlineRequired" })
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "portalValidation.deadlineInvalid",
    }),
  customerName: z
    .string()
    .trim()
    .min(2, { message: "validation.nameTooShort" })
    .max(100, { message: "validation.nameTooLong" }),
  customerPhone: z
    .string()
    .trim()
    .min(9, { message: "validation.phoneRequired" })
    .transform(normalizeUzPhone)
    .refine((val) => UZ_PHONE_REGEX.test(val), {
      message: "validation.phoneInvalidUz",
    }),
  notes: z.string().trim().max(1000, { message: "portalValidation.notesTooLong" }).optional(),
  assignedDriverId: z.string().uuid().optional().or(z.literal("")),
  assignedVehicleId: z.string().uuid().optional().or(z.literal("")),
});

export const orderAssignSchema = z.object({
  orderId: z.string().uuid(),
  driverId: z.string().uuid({ message: "portalValidation.driverRequired" }),
  vehicleId: z.string().uuid({ message: "portalValidation.vehicleRequired" }),
});

export const orderStatusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  nextStatus: z.enum(["new", "assigned", "in_transit", "delivered", "cancelled"]),
  note: z.string().trim().max(500).optional(),
});

export const vehicleFormSchema = z.object({
  id: z.string().uuid().optional(),
  vehicleType: z.enum(["tent", "refrigerator", "flatbed", "container", "van", "other"]),
  plateNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, { message: "onboardingValidation.plateInvalid" })
    .max(20, { message: "onboardingValidation.plateInvalid" })
    .regex(/^[A-Z0-9\s-]{4,20}$/, { message: "onboardingValidation.plateInvalid" }),
  capacityKg: z.coerce
    .number()
    .int()
    .min(100, { message: "onboardingValidation.capacityRange" })
    .max(100000, { message: "onboardingValidation.capacityRange" }),
  region: z
    .string()
    .trim()
    .min(2, { message: "onboardingValidation.cityRequired" })
    .max(80, { message: "onboardingValidation.cityTooLong" }),
  status: z.enum(["available", "on_trip", "maintenance", "inactive"]).default("available"),
});

export const createInviteSchema = z.object({
  role: z.enum(["dispatcher", "driver"]),
  invitedEmail: z
    .union([z.literal(""), z.string().trim().toLowerCase().email().max(254)])
    .optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const companySettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "validation.companyTooShort" })
    .max(120, { message: "validation.companyTooLong" }),
  legalForm: z.enum(["llc", "ie", "jsc", "other"]),
  cityRegion: z
    .string()
    .trim()
    .min(2, { message: "onboardingValidation.cityRequired" })
    .max(80, { message: "onboardingValidation.cityTooLong" }),
  fleetSize: z.enum(["1-4", "5-15", "16-30", "30+"]),
});

export const driverProfileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "validation.nameTooShort" })
    .max(100, { message: "validation.nameTooLong" }),
  phone: z
    .string()
    .trim()
    .min(9, { message: "validation.phoneRequired" })
    .transform(normalizeUzPhone)
    .refine((val) => UZ_PHONE_REGEX.test(val), {
      message: "validation.phoneInvalidUz",
    }),
  preferredLanguage: z.enum(["uz", "ru", "en"]),
});

export const DELIVERY_PROOF_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const DELIVERY_PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const deliveryProofMetaSchema = z.object({
  orderId: z.string().uuid(),
  note: z.string().trim().max(500, { message: "portalValidation.notesTooLong" }).optional(),
});

export type OrderFormInput = z.infer<typeof orderFormSchema>;
export type VehicleFormInput = z.infer<typeof vehicleFormSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
export type DriverProfileUpdateInput = z.infer<typeof driverProfileUpdateSchema>;
