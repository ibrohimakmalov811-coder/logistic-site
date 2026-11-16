import { z } from "zod";

export const UserRoleSchema = z.enum(["company_owner", "dispatcher", "driver"]);
export const AppLocaleSchema = z.enum(["uz", "ru", "en"]);
export const VehicleTypeSchema = z.enum([
  "tent",
  "isotherm",
  "refrigerator",
  "container",
  "flatbed",
  "dump",
]);
export const VehicleStatusSchema = z.enum(["active", "maintenance", "inactive"]);
export const OrderStatusSchema = z.enum([
  "new",
  "assigned",
  "in_transit",
  "delivered",
  "cancelled",
]);
export const InviteStatusSchema = z.enum(["active", "used", "expired", "revoked"]);

export const UserSchema = z.object({
  id: z.string().min(1),
  role: UserRoleSchema,
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+998\d{9}$/, "Invalid phone format (+998XXXXXXXXX)"),
  email: z.string().trim().email().toLowerCase(),
  language: AppLocaleSchema,
  avatar: z.string().nullable(),
  createdAt: z.string().datetime(),
  onboardingCompleted: z.boolean(),
});

export const UserCredentialsSchema = z.object({
  userId: z.string().min(1),
  passwordHash: z.string().min(1),
  salt: z.string().min(1),
});

export const UserSessionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  role: UserRoleSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const CompanySchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  fleetSize: z.string().optional(),
  cargoTypes: z.array(z.string()).optional(),
  inviteCode: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const MembershipSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  companyId: z.string().min(1),
  role: UserRoleSchema,
  isActive: z.boolean(),
  joinedAt: z.string().datetime(),
});

export const InviteSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  role: z.enum(["dispatcher", "driver"]),
  codeHash: z.string().min(1),
  codePreview: z.string().min(4),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  usedAt: z.string().datetime().nullable(),
  usedBy: z.string().nullable(),
  revokedAt: z.string().datetime().nullable(),
});

export const VehicleSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  type: VehicleTypeSchema,
  plateNumber: z.string().trim().min(2).max(20),
  capacityKg: z.number().positive(),
  status: VehicleStatusSchema,
  createdAt: z.string().datetime(),
});

export const DriverProfileSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().min(1),
  licenseCategory: z.string().trim().min(1).max(20),
  experienceYears: z.number().int().nonnegative(),
  vehicleId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OrderSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  pickupAddress: z.string().trim().min(3).max(200),
  deliveryAddress: z.string().trim().min(3).max(200),
  cargoDescription: z.string().trim().min(2).max(300),
  weightKg: z.number().positive(),
  deadline: z.string().datetime(),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(/^\+?[0-9\s\-()]{7,25}$/, "Invalid customer phone"),
  notes: z.string().max(1000).default(""),
  status: OrderStatusSchema,
  driverId: z.string().nullable(),
  vehicleId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OrderStatusHistorySchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  status: OrderStatusSchema,
  changedBy: z.string().min(1),
  changedAt: z.string().datetime(),
  note: z.string().max(500).default(""),
});

export const DeliveryProofSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  imageBlobRef: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().positive(),
  note: z.string().max(500).default(""),
  createdAt: z.string().datetime(),
  submittedBy: z.string().min(1),
});

export const InAppNotificationSchema = z.object({
  id: z.string().min(1),
  recipientUserId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(1000),
  targetType: z.enum(["order", "invite", "system"]),
  targetId: z.string().optional(),
  isRead: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const OnboardingDraftSchema = z.object({
  userId: z.string().min(1),
  step: z.number().int().min(1),
  data: z.record(z.unknown()),
  updatedAt: z.string().datetime(),
});

// Input Schemas
export const RegisterInputSchema = z.object({
  role: UserRoleSchema,
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  phone: z.string().trim().regex(/^\+998\d{9}$/, "Phone must match +998XXXXXXXXX"),
  email: z.string().trim().email("Invalid email").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  language: AppLocaleSchema.default("uz"),
  inviteCode: z.string().trim().optional(),
});

export const LoginInputSchema = z.object({
  identifier: z.string().trim().min(3, "Phone or email required"),
  password: z.string().min(1, "Password required"),
});

export const CreateInviteInputSchema = z.object({
  role: z.enum(["dispatcher", "driver"]),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const RedeemInviteInputSchema = z.object({
  code: z.string().trim().min(8).max(10),
});

export const CreateOrderInputSchema = z.object({
  pickupAddress: z.string().trim().min(3, "Pickup address required"),
  deliveryAddress: z.string().trim().min(3, "Delivery address required"),
  cargoDescription: z.string().trim().min(2, "Cargo description required"),
  weightKg: z.number().positive("Weight must be positive"),
  deadline: z.string().datetime("Valid deadline required"),
  customerName: z.string().trim().min(2, "Customer name required"),
  customerPhone: z.string().trim().min(7, "Customer phone required"),
  notes: z.string().max(1000).optional().default(""),
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
});

export const UpdateOrderStatusInputSchema = z.object({
  orderId: z.string().min(1),
  newStatus: OrderStatusSchema,
  note: z.string().max(500).optional().default(""),
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
});
