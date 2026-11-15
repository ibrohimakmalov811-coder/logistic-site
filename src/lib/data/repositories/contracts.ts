import {
  CompanyEntity,
  DeliveryProofEntity,
  DriverProfileEntity,
  InAppNotificationEntity,
  InviteEntity,
  MembershipEntity,
  OnboardingDraftEntity,
  OrderEntity,
  OrderStatus,
  OrderStatusHistoryEntity,
  UserCredentialsEntity,
  UserEntity,
  UserRole,
  UserSessionEntity,
  VehicleEntity,
} from "../types";

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  create(
    user: Omit<UserEntity, "id" | "createdAt" | "onboardingCompleted">,
    passwordHash: string,
    salt: string
  ): Promise<UserEntity>;
  update(id: string, updates: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: string): Promise<void>;
  getCredentials(userId: string): Promise<UserCredentialsEntity | null>;
  createSession(userId: string, role: UserRole): Promise<UserSessionEntity>;
  getSession(sessionId: string): Promise<UserSessionEntity | null>;
  getCurrentSession(): Promise<UserSessionEntity | null>;
  setCurrentSession(sessionId: string): Promise<void>;
  clearSession(): Promise<void>;
  getDraft(userId: string): Promise<OnboardingDraftEntity | null>;
  saveDraft(userId: string, step: number, data: Record<string, unknown>): Promise<void>;
  clearDraft(userId: string): Promise<void>;
}

export interface ICompanyRepository {
  findById(id: string): Promise<CompanyEntity | null>;
  findByOwnerId(ownerId: string): Promise<CompanyEntity | null>;
  findByUserId(userId: string): Promise<CompanyEntity | null>;
  create(
    ownerId: string,
    name: string,
    city: string,
    fleetSize?: string,
    cargoTypes?: string[]
  ): Promise<CompanyEntity>;
  update(id: string, updates: Partial<CompanyEntity>): Promise<CompanyEntity>;
  getMembers(companyId: string): Promise<Array<MembershipEntity & { user: UserEntity }>>;
  addMember(companyId: string, userId: string, role: UserRole): Promise<MembershipEntity>;
  removeMember(companyId: string, userId: string): Promise<void>;
  getDriverProfile(userId: string): Promise<DriverProfileEntity | null>;
  saveDriverProfile(profile: DriverProfileEntity): Promise<DriverProfileEntity>;
}

export interface IInviteRepository {
  createInvite(
    companyId: string,
    createdBy: string,
    role: "dispatcher" | "driver",
    expiresInDays?: number
  ): Promise<{ invite: InviteEntity; rawCode: string }>;
  listByCompany(companyId: string): Promise<InviteEntity[]>;
  revokeInvite(inviteId: string, companyId: string): Promise<void>;
  validateInviteCode(
    rawCode: string,
    userRole: UserRole
  ): Promise<{ valid: boolean; error?: string }>;
  verifyAndRedeemInvite(
    rawCode: string,
    userId: string,
    userRole: UserRole
  ): Promise<{ success: boolean; companyId?: string; error?: string }>;
}

export interface IVehicleRepository {
  listByCompany(companyId: string): Promise<VehicleEntity[]>;
  findById(id: string): Promise<VehicleEntity | null>;
  create(vehicle: Omit<VehicleEntity, "id" | "createdAt">): Promise<VehicleEntity>;
  update(id: string, updates: Partial<VehicleEntity>): Promise<VehicleEntity>;
  delete(id: string): Promise<void>;
}

export interface OrderQueryOptions {
  status?: OrderStatus;
  driverId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IOrderRepository {
  listByCompany(
    companyId: string,
    options?: OrderQueryOptions
  ): Promise<{ orders: OrderEntity[]; total: number }>;
  listByDriver(
    driverId: string,
    options?: { status?: OrderStatus; page?: number; limit?: number }
  ): Promise<{ orders: OrderEntity[]; total: number }>;
  findById(id: string): Promise<OrderEntity | null>;
  create(order: Omit<OrderEntity, "id" | "createdAt" | "updatedAt" | "status">): Promise<OrderEntity>;
  updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedByUserId: string,
    note?: string
  ): Promise<OrderEntity>;
  assignDriverAndVehicle(
    orderId: string,
    driverId: string | null,
    vehicleId: string | null,
    changedByUserId: string
  ): Promise<OrderEntity>;
  getStatusHistory(orderId: string): Promise<OrderStatusHistoryEntity[]>;
  submitDeliveryProof(
    orderId: string,
    submittedBy: string,
    imageBlob: Blob | string,
    mimeType: string,
    note?: string
  ): Promise<DeliveryProofEntity>;
  getDeliveryProof(orderId: string): Promise<DeliveryProofEntity | null>;
}

export interface INotificationRepository {
  listByUser(userId: string): Promise<InAppNotificationEntity[]>;
  create(
    notification: Omit<InAppNotificationEntity, "id" | "createdAt" | "isRead">
  ): Promise<InAppNotificationEntity>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}
