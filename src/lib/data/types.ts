import { z } from "zod";

export type UserRole = "company_owner" | "dispatcher" | "driver";
export type AppLocale = "uz" | "ru" | "en";
export type VehicleType = "tent" | "isotherm" | "refrigerator" | "container" | "flatbed" | "dump";
export type VehicleStatus = "active" | "maintenance" | "inactive";
export type OrderStatus = "new" | "assigned" | "in_transit" | "delivered" | "cancelled";
export type InviteStatus = "active" | "used" | "expired" | "revoked";

export interface UserEntity {
  id: string;
  role: UserRole;
  fullName: string;
  phone: string;
  email: string;
  language: AppLocale;
  avatar: string | null;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface UserCredentialsEntity {
  userId: string;
  passwordHash: string;
  salt: string;
}

export interface UserSessionEntity {
  sessionId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

export interface CompanyEntity {
  id: string;
  ownerId: string;
  name: string;
  city: string;
  fleetSize?: string;
  cargoTypes?: string[];
  createdAt: string;
}

export interface MembershipEntity {
  id: string;
  userId: string;
  companyId: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
}

export interface InviteEntity {
  id: string;
  companyId: string;
  role: "dispatcher" | "driver";
  codeHash: string;
  codePreview: string; // e.g. "ABCD-****" for safe display
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  usedAt: string | null;
  usedBy: string | null;
  revokedAt: string | null;
}

export interface VehicleEntity {
  id: string;
  companyId: string;
  type: VehicleType;
  plateNumber: string;
  capacityKg: number;
  status: VehicleStatus;
  createdAt: string;
}

export interface DriverProfileEntity {
  userId: string;
  companyId: string;
  licenseCategory: string;
  experienceYears: number;
  vehicleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEntity {
  id: string;
  companyId: string;
  pickupAddress: string;
  deliveryAddress: string;
  cargoDescription: string;
  weightKg: number;
  deadline: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  status: OrderStatus;
  driverId: string | null;
  vehicleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistoryEntity {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedBy: string;
  changedAt: string;
  note: string;
}

export interface DeliveryProofEntity {
  id: string;
  orderId: string;
  imageBlobRef: string; // IndexedDB key reference
  mimeType: string;
  fileSize: number;
  note: string;
  createdAt: string;
  submittedBy: string;
}

export interface InAppNotificationEntity {
  id: string;
  recipientUserId: string;
  title: string;
  message: string;
  targetType: "order" | "invite" | "system";
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface OnboardingDraftEntity {
  userId: string;
  step: number;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface StorageSnapshot {
  version: number;
  updatedAt: string;
  users: UserEntity[];
  credentials: UserCredentialsEntity[];
  sessions: UserSessionEntity[];
  companies: CompanyEntity[];
  memberships: MembershipEntity[];
  invites: InviteEntity[];
  vehicles: VehicleEntity[];
  driverProfiles: DriverProfileEntity[];
  orders: OrderEntity[];
  orderStatusHistory: OrderStatusHistoryEntity[];
  deliveryProofs: DeliveryProofEntity[];
  notifications: InAppNotificationEntity[];
  onboardingDrafts: OnboardingDraftEntity[];
}
