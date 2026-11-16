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
import {
  ICompanyRepository,
  IInviteRepository,
  INotificationRepository,
  IOrderRepository,
  IUserRepository,
  IVehicleRepository,
  OrderQueryOptions,
} from "./contracts";
import { loadSnapshot, saveSnapshot } from "../storage-engine";
import { formatInviteCodePreview, generateInviteCode, hashInviteCode, normalizeInviteCode } from "../crypto";
import { getBlobUrl, saveBase64AsBlob, saveBlob } from "../idb";
import { syncChannel } from "../sync-channel";

const SESSION_POINTER_KEY = "transflow_session_id";
const INVITE_ATTEMPTS_KEY = "transflow_invite_attempts";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "tf_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// ----------------------------------------------------
// USER REPOSITORY
// ----------------------------------------------------
export class LocalUserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const snapshot = loadSnapshot();
    const normalized = email.trim().toLowerCase();
    return snapshot.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const snapshot = loadSnapshot();
    const cleanPhone = phone.replace(/\s+/g, "");
    return snapshot.users.find((u) => u.phone.replace(/\s+/g, "") === cleanPhone) || null;
  }

  async create(
    user: Omit<UserEntity, "id" | "createdAt" | "onboardingCompleted">,
    passwordHash: string,
    salt: string
  ): Promise<UserEntity> {
    const snapshot = loadSnapshot();

    const cleanEmail = user.email.trim().toLowerCase();
    const cleanPhone = user.phone.replace(/\s+/g, "");

    if (snapshot.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error("Bu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan.");
    }

    if (snapshot.users.some((u) => u.phone.replace(/\s+/g, "") === cleanPhone)) {
      throw new Error("Bu telefon raqam bilan foydalanuvchi allaqachon ro'yxatdan o'tgan.");
    }

    const newUser: UserEntity = {
      id: generateId(),
      ...user,
      email: cleanEmail,
      phone: cleanPhone,
      createdAt: new Date().toISOString(),
      onboardingCompleted: false,
    };

    const newCredentials: UserCredentialsEntity = {
      userId: newUser.id,
      passwordHash,
      salt,
    };

    snapshot.users.push(newUser);
    snapshot.credentials.push(newCredentials);
    saveSnapshot(snapshot);

    return newUser;
  }

  async update(id: string, updates: Partial<UserEntity>): Promise<UserEntity> {
    const snapshot = loadSnapshot();
    const index = snapshot.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error("Foydalanuvchi topilmadi.");
    }

    const updated = {
      ...snapshot.users[index],
      ...updates,
    };
    snapshot.users[index] = updated;
    saveSnapshot(snapshot);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const snapshot = loadSnapshot();
    snapshot.users = snapshot.users.filter((u) => u.id !== id);
    snapshot.credentials = snapshot.credentials.filter((c) => c.userId !== id);
    saveSnapshot(snapshot);
  }

  async getCredentials(userId: string): Promise<UserCredentialsEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.credentials.find((c) => c.userId === userId) || null;
  }

  async createSession(userId: string, role: UserRole): Promise<UserSessionEntity> {
    const snapshot = loadSnapshot();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session: UserSessionEntity = {
      sessionId: generateId(),
      userId,
      role,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    snapshot.sessions.push(session);
    saveSnapshot(snapshot);
    await this.setCurrentSession(session.sessionId);

    return session;
  }

  async getSession(sessionId: string): Promise<UserSessionEntity | null> {
    const snapshot = loadSnapshot();
    const session = snapshot.sessions.find((s) => s.sessionId === sessionId);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return session;
  }

  async getCurrentSession(): Promise<UserSessionEntity | null> {
    if (typeof window === "undefined") return null;
    const sessionId = window.localStorage.getItem(SESSION_POINTER_KEY);
    if (!sessionId) return null;
    return this.getSession(sessionId);
  }

  async setCurrentSession(sessionId: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SESSION_POINTER_KEY, sessionId);
    // Also mirror to a simple auth cookie so Next.js server/middleware knows a session exists
    document.cookie = `tf_session=${sessionId}; path=/; max-age=604800; SameSite=Lax`;
  }

  async clearSession(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(SESSION_POINTER_KEY);
    document.cookie = `tf_session=; path=/; max-age=0; SameSite=Lax`;
  }

  async getDraft(userId: string): Promise<OnboardingDraftEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.onboardingDrafts.find((d) => d.userId === userId) || null;
  }

  async saveDraft(userId: string, step: number, data: Record<string, unknown>): Promise<void> {
    const snapshot = loadSnapshot();
    const index = snapshot.onboardingDrafts.findIndex((d) => d.userId === userId);
    const draft: OnboardingDraftEntity = {
      userId,
      step,
      data,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      snapshot.onboardingDrafts[index] = draft;
    } else {
      snapshot.onboardingDrafts.push(draft);
    }
    saveSnapshot(snapshot);
  }

  async clearDraft(userId: string): Promise<void> {
    const snapshot = loadSnapshot();
    snapshot.onboardingDrafts = snapshot.onboardingDrafts.filter((d) => d.userId !== userId);
    saveSnapshot(snapshot);
  }
}

// ----------------------------------------------------
// COMPANY REPOSITORY
// ----------------------------------------------------
export class LocalCompanyRepository implements ICompanyRepository {
  async findById(id: string): Promise<CompanyEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.companies.find((c) => c.id === id) || null;
  }

  async findByOwnerId(ownerId: string): Promise<CompanyEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.companies.find((c) => c.ownerId === ownerId) || null;
  }

  async findByUserId(userId: string): Promise<CompanyEntity | null> {
    const snapshot = loadSnapshot();
    const membership = snapshot.memberships.find((m) => m.userId === userId && m.isActive);
    if (!membership) return null;
    return snapshot.companies.find((c) => c.id === membership.companyId) || null;
  }

  async create(
    ownerId: string,
    name: string,
    city: string,
    fleetSize?: string,
    cargoTypes?: string[]
  ): Promise<CompanyEntity> {
    const snapshot = loadSnapshot();
    const rawInviteCode = generateInviteCode();
    const company: CompanyEntity = {
      id: generateId(),
      ownerId,
      name: name.trim(),
      city: city.trim(),
      fleetSize,
      cargoTypes,
      inviteCode: rawInviteCode,
      createdAt: new Date().toISOString(),
    };

    const ownerMembership: MembershipEntity = {
      id: generateId(),
      userId: ownerId,
      companyId: company.id,
      role: "company_owner",
      isActive: true,
      joinedAt: new Date().toISOString(),
    };

    snapshot.companies.push(company);
    snapshot.memberships.push(ownerMembership);
    saveSnapshot(snapshot);

    return company;
  }

  async update(id: string, updates: Partial<CompanyEntity>): Promise<CompanyEntity> {
    const snapshot = loadSnapshot();
    const index = snapshot.companies.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Kompaniya topilmadi.");

    const updated = { ...snapshot.companies[index], ...updates };
    snapshot.companies[index] = updated;
    saveSnapshot(snapshot);
    return updated;
  }

  async getMembers(companyId: string): Promise<Array<MembershipEntity & { user: UserEntity }>> {
    const snapshot = loadSnapshot();
    const members = snapshot.memberships.filter((m) => m.companyId === companyId && m.isActive);

    const result: Array<MembershipEntity & { user: UserEntity }> = [];
    for (const m of members) {
      const user = snapshot.users.find((u) => u.id === m.userId);
      if (user) {
        result.push({ ...m, user });
      }
    }
    return result;
  }

  async addMember(companyId: string, userId: string, role: UserRole): Promise<MembershipEntity> {
    const snapshot = loadSnapshot();
    const existing = snapshot.memberships.find(
      (m) => m.companyId === companyId && m.userId === userId
    );

    if (existing) {
      existing.isActive = true;
      existing.role = role;
      saveSnapshot(snapshot);
      return existing;
    }

    const membership: MembershipEntity = {
      id: generateId(),
      userId,
      companyId,
      role,
      isActive: true,
      joinedAt: new Date().toISOString(),
    };

    snapshot.memberships.push(membership);
    saveSnapshot(snapshot);
    return membership;
  }

  async removeMember(companyId: string, userId: string): Promise<void> {
    const snapshot = loadSnapshot();
    const membership = snapshot.memberships.find(
      (m) => m.companyId === companyId && m.userId === userId
    );
    if (membership) {
      membership.isActive = false;
      saveSnapshot(snapshot);
    }
  }

  async getDriverProfile(userId: string): Promise<DriverProfileEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.driverProfiles.find((dp) => dp.userId === userId) || null;
  }

  async saveDriverProfile(profile: DriverProfileEntity): Promise<DriverProfileEntity> {
    const snapshot = loadSnapshot();
    const index = snapshot.driverProfiles.findIndex((dp) => dp.userId === profile.userId);
    const updated = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      snapshot.driverProfiles[index] = updated;
    } else {
      snapshot.driverProfiles.push(updated);
    }
    saveSnapshot(snapshot);
    return updated;
  }
}

// ----------------------------------------------------
// INVITE REPOSITORY
// ----------------------------------------------------
export class LocalInviteRepository implements IInviteRepository {
  async createInvite(
    companyId: string,
    createdBy: string,
    role: "dispatcher" | "driver",
    expiresInDays = 7
  ): Promise<{ invite: InviteEntity; rawCode: string }> {
    const snapshot = loadSnapshot();
    const rawCode = generateInviteCode();
    const codeHash = await hashInviteCode(rawCode);
    const codePreview = formatInviteCodePreview(rawCode);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const invite: InviteEntity = {
      id: generateId(),
      companyId,
      role,
      codeHash,
      codePreview,
      expiresAt,
      createdAt: now.toISOString(),
      createdBy,
      usedAt: null,
      usedBy: null,
      revokedAt: null,
    };

    snapshot.invites.push(invite);
    saveSnapshot(snapshot);

    syncChannel.broadcast("INVITE_CREATED", { companyId });

    return { invite, rawCode };
  }

  async listByCompany(companyId: string): Promise<InviteEntity[]> {
    const snapshot = loadSnapshot();
    return snapshot.invites
      .filter((inv) => inv.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async revokeInvite(inviteId: string, companyId: string): Promise<void> {
    const snapshot = loadSnapshot();
    const invite = snapshot.invites.find((inv) => inv.id === inviteId && inv.companyId === companyId);
    if (!invite) throw new Error("Taklifnoma topilmadi.");

    invite.revokedAt = new Date().toISOString();
    saveSnapshot(snapshot);

    syncChannel.broadcast("INVITE_REVOKED", { companyId });
  }

  async validateInviteCode(
    rawCode: string,
    userRole: UserRole
  ): Promise<{ valid: boolean; error?: string }> {
    const cleanRaw = rawCode.trim().toUpperCase();
    const normalizedRaw = normalizeInviteCode(cleanRaw);
    const snapshot = loadSnapshot();

    // 1. Check if it matches any company-level invite code
    const matchingCompany = snapshot.companies.find((c) => {
      if (!c.inviteCode) return false;
      return normalizeInviteCode(c.inviteCode) === normalizedRaw;
    });

    if (matchingCompany) {
      return { valid: true };
    }

    // 2. Otherwise check single-use invites
    const codeHash = await hashInviteCode(rawCode);
    const invite = snapshot.invites.find((inv) => inv.codeHash === codeHash);

    if (!invite) {
      return { valid: false, error: "Taklif kodi topilmadi yoki xato kiritildi." };
    }
    if (invite.revokedAt) {
      return { valid: false, error: "Bu taklifnoma bekor qilingan." };
    }
    if (invite.usedAt) {
      return { valid: false, error: "Bu taklif kodi allaqachon ishlatilgan." };
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: "Taklif kodining amal qilish muddati tugagan." };
    }
    if (invite.role !== userRole) {
      return {
        valid: false,
        error: `Bu taklif ${invite.role === "driver" ? "haydovchi" : "dispetcher"} roli uchun mo'ljallangan.`,
      };
    }
    return { valid: true };
  }

  async verifyAndRedeemInvite(
    rawCode: string,
    userId: string,
    userRole: UserRole
  ): Promise<{ success: boolean; companyId?: string; error?: string }> {
    // 1. Rate limiting / brute-force protection (5 attempts lockout)
    if (typeof window !== "undefined") {
      const attemptsStr = window.sessionStorage.getItem(INVITE_ATTEMPTS_KEY);
      const attempts = attemptsStr ? JSON.parse(attemptsStr) : { count: 0, lockedUntil: 0 };

      if (attempts.lockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
        return {
          success: false,
          error: `Ko'p urinishlar tufayli tizim bloklandi. Iltimos ${remainingMinutes} daqiqadan so'ng qayta urinib ko'ring.`,
        };
      }
    }

    const cleanRaw = rawCode.trim().toUpperCase();
    const normalizedRaw = normalizeInviteCode(cleanRaw);
    const snapshot = loadSnapshot();
    const companyRepo = new LocalCompanyRepository();

    // Check if it matches a company-level master invite code
    const matchingCompany = snapshot.companies.find((c) => {
      if (!c.inviteCode) return false;
      return normalizeInviteCode(c.inviteCode) === normalizedRaw;
    });

    if (matchingCompany) {
      await companyRepo.addMember(matchingCompany.id, userId, userRole);

      if (userRole === "driver") {
        const existingDp = snapshot.driverProfiles.find((dp) => dp.userId === userId);
        if (!existingDp) {
          snapshot.driverProfiles.push({
            userId,
            companyId: matchingCompany.id,
            licenseCategory: "B, C, CE",
            experienceYears: 3,
            vehicleId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          saveSnapshot(snapshot);
        }
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(INVITE_ATTEMPTS_KEY);
      }

      syncChannel.broadcast("INVITE_REDEEMED", { companyId: matchingCompany.id, userId });
      return { success: true, companyId: matchingCompany.id };
    }

    const codeHash = await hashInviteCode(rawCode);
    const invite = snapshot.invites.find((inv) => inv.codeHash === codeHash);

    if (!invite) {
      this.recordFailedAttempt();
      return { success: false, error: "Taklif kodi noto'g'ri kiritildi." };
    }

    if (invite.revokedAt) {
      return { success: false, error: "Bu taklifnoma bekor qilingan." };
    }

    if (invite.usedAt) {
      return { success: false, error: "Bu taklif kodi allaqachon ishlatilgan." };
    }

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return { success: false, error: "Taklif kodining amal qilish muddati tugagan." };
    }

    if (invite.role !== userRole) {
      return {
        success: false,
        error: `Bu taklif ${invite.role === "driver" ? "haydovchi" : "dispetcher"} roli uchun mo'ljallangan.`,
      };
    }

    // Mark as used
    invite.usedAt = new Date().toISOString();
    invite.usedBy = userId;

    // Link user to company membership
    await companyRepo.addMember(invite.companyId, userId, userRole);

    if (userRole === "driver") {
      const existingDp = snapshot.driverProfiles.find((dp) => dp.userId === userId);
      if (!existingDp) {
        snapshot.driverProfiles.push({
          userId,
          companyId: invite.companyId,
          licenseCategory: "B, C, CE",
          experienceYears: 3,
          vehicleId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    saveSnapshot(snapshot);

    // Reset attempts on success
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(INVITE_ATTEMPTS_KEY);
    }

    syncChannel.broadcast("INVITE_REDEEMED", { companyId: invite.companyId, userId });

    return { success: true, companyId: invite.companyId };
  }

  private recordFailedAttempt() {
    if (typeof window === "undefined") return;
    try {
      const attemptsStr = window.sessionStorage.getItem(INVITE_ATTEMPTS_KEY);
      const attempts = attemptsStr ? JSON.parse(attemptsStr) : { count: 0, lockedUntil: 0 };
      attempts.count += 1;
      if (attempts.count >= 5) {
        attempts.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
      }
      window.sessionStorage.setItem(INVITE_ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {
      // Ignore
    }
  }
}

// ----------------------------------------------------
// VEHICLE REPOSITORY
// ----------------------------------------------------
export class LocalVehicleRepository implements IVehicleRepository {
  async listByCompany(companyId: string): Promise<VehicleEntity[]> {
    const snapshot = loadSnapshot();
    return snapshot.vehicles.filter((v) => v.companyId === companyId);
  }

  async findById(id: string): Promise<VehicleEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.vehicles.find((v) => v.id === id) || null;
  }

  async create(vehicle: Omit<VehicleEntity, "id" | "createdAt">): Promise<VehicleEntity> {
    const snapshot = loadSnapshot();
    const newVehicle: VehicleEntity = {
      id: generateId(),
      ...vehicle,
      createdAt: new Date().toISOString(),
    };
    snapshot.vehicles.push(newVehicle);
    saveSnapshot(snapshot);
    syncChannel.broadcast("VEHICLE_ADDED", { companyId: vehicle.companyId });
    return newVehicle;
  }

  async update(id: string, updates: Partial<VehicleEntity>): Promise<VehicleEntity> {
    const snapshot = loadSnapshot();
    const index = snapshot.vehicles.findIndex((v) => v.id === id);
    if (index === -1) throw new Error("Transport vositasi topilmadi.");

    const updated = { ...snapshot.vehicles[index], ...updates };
    snapshot.vehicles[index] = updated;
    saveSnapshot(snapshot);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const snapshot = loadSnapshot();
    snapshot.vehicles = snapshot.vehicles.filter((v) => v.id !== id);
    saveSnapshot(snapshot);
  }
}

// ----------------------------------------------------
// ORDER REPOSITORY
// ----------------------------------------------------
export class LocalOrderRepository implements IOrderRepository {
  private notificationRepo = new LocalNotificationRepository();

  async listByCompany(
    companyId: string,
    options?: OrderQueryOptions
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    const snapshot = loadSnapshot();
    let list = snapshot.orders.filter((o) => o.companyId === companyId);

    if (options?.status) {
      list = list.filter((o) => o.status === options.status);
    }
    if (options?.driverId) {
      list = list.filter((o) => o.driverId === options.driverId);
    }
    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.pickupAddress.toLowerCase().includes(q) ||
          o.deliveryAddress.toLowerCase().includes(q) ||
          o.cargoDescription.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return { orders: paginated, total };
  }

  async listByDriver(
    driverId: string,
    options?: { status?: OrderStatus; page?: number; limit?: number }
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    const snapshot = loadSnapshot();
    let list = snapshot.orders.filter((o) => o.driverId === driverId);

    if (options?.status) {
      list = list.filter((o) => o.status === options.status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return { orders: paginated, total };
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.orders.find((o) => o.id === id) || null;
  }

  async create(order: Omit<OrderEntity, "id" | "createdAt" | "updatedAt" | "status">): Promise<OrderEntity> {
    const snapshot = loadSnapshot();
    const now = new Date().toISOString();
    const initialStatus: OrderStatus = order.driverId ? "assigned" : "new";

    const newOrder: OrderEntity = {
      id: generateId(),
      ...order,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
    };

    const initialHistory: OrderStatusHistoryEntity = {
      id: generateId(),
      orderId: newOrder.id,
      status: initialStatus,
      changedBy: "company",
      changedAt: now,
      note: "Buyurtma yaratildi",
    };

    snapshot.orders.push(newOrder);
    snapshot.orderStatusHistory.push(initialHistory);
    saveSnapshot(snapshot);

    if (newOrder.driverId) {
      await this.notificationRepo.create({
        recipientUserId: newOrder.driverId,
        title: "Yangi buyurtma biriktirildi",
        message: `${newOrder.pickupAddress} -> ${newOrder.deliveryAddress} yo'nalishidagi buyurtma sizga biriktirildi.`,
        targetType: "order",
        targetId: newOrder.id,
      });
    }

    syncChannel.broadcast("ORDER_CREATED", { companyId: newOrder.companyId, orderId: newOrder.id });

    return newOrder;
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedByUserId: string,
    note = ""
  ): Promise<OrderEntity> {
    const snapshot = loadSnapshot();
    const order = snapshot.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Buyurtma topilmadi.");

    // Enforce Plan A state machine
    const current = order.status;
    const allowed = this.isValidTransition(current, newStatus);
    if (!allowed) {
      throw new Error(`Holatni '${current}' dan '${newStatus}' ga o'zgartirish ruxsat etilmagan.`);
    }

    const now = new Date().toISOString();
    order.status = newStatus;
    order.updatedAt = now;

    const historyEntry: OrderStatusHistoryEntity = {
      id: generateId(),
      orderId,
      status: newStatus,
      changedBy: changedByUserId,
      changedAt: now,
      note,
    };

    snapshot.orderStatusHistory.push(historyEntry);
    saveSnapshot(snapshot);

    // Notify counterparties
    const company = snapshot.companies.find((c) => c.id === order.companyId);
    if (company && changedByUserId === order.driverId) {
      // Driver updated status, notify company owner
      await this.notificationRepo.create({
        recipientUserId: company.ownerId,
        title: `Buyurtma holati o'zgardi: #${order.id.slice(0, 8)}`,
        message: `Haydovchi buyurtma holatini '${newStatus}' holatiga o'tkazdi.`,
        targetType: "order",
        targetId: order.id,
      });
    } else if (order.driverId && changedByUserId !== order.driverId) {
      // Company updated status, notify driver
      await this.notificationRepo.create({
        recipientUserId: order.driverId,
        title: `Buyurtma holati yangilandi: #${order.id.slice(0, 8)}`,
        message: `Dispetcher buyurtmani '${newStatus}' holatiga o'zgartirdi.`,
        targetType: "order",
        targetId: order.id,
      });
    }

    syncChannel.broadcast("ORDER_STATUS_CHANGED", {
      companyId: order.companyId,
      orderId: order.id,
      userId: changedByUserId,
    });

    return order;
  }

  private isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) return true;
    if (from === "cancelled" || from === "delivered") return false; // terminal states
    if (to === "cancelled") return true; // can cancel from new, assigned, in_transit

    switch (from) {
      case "new":
        return to === "assigned";
      case "assigned":
        return to === "in_transit" || to === "new";
      case "in_transit":
        return to === "delivered";
      default:
        return false;
    }
  }

  async assignDriverAndVehicle(
    orderId: string,
    driverId: string | null,
    vehicleId: string | null,
    changedByUserId: string
  ): Promise<OrderEntity> {
    const snapshot = loadSnapshot();
    const order = snapshot.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Buyurtma topilmadi.");

    const now = new Date().toISOString();
    order.driverId = driverId;
    order.vehicleId = vehicleId;
    order.updatedAt = now;

    if (driverId && order.status === "new") {
      order.status = "assigned";
    } else if (!driverId && order.status === "assigned") {
      order.status = "new";
    }

    const historyEntry: OrderStatusHistoryEntity = {
      id: generateId(),
      orderId,
      status: order.status,
      changedBy: changedByUserId,
      changedAt: now,
      note: driverId ? "Haydovchi va transport biriktirildi" : "Haydovchi biriktiruvi bekor qilindi",
    };

    snapshot.orderStatusHistory.push(historyEntry);
    saveSnapshot(snapshot);

    if (driverId) {
      await this.notificationRepo.create({
        recipientUserId: driverId,
        title: "Yangi buyurtma biriktirildi",
        message: `Sizga #${order.id.slice(0, 8)} raqamli buyurtma biriktirildi.`,
        targetType: "order",
        targetId: order.id,
      });
    }

    syncChannel.broadcast("ORDER_ASSIGNED", { companyId: order.companyId, orderId: order.id });

    return order;
  }

  async getStatusHistory(orderId: string): Promise<OrderStatusHistoryEntity[]> {
    const snapshot = loadSnapshot();
    return snapshot.orderStatusHistory
      .filter((h) => h.orderId === orderId)
      .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
  }

  async submitDeliveryProof(
    orderId: string,
    submittedBy: string,
    imageBlob: Blob | string,
    mimeType = "image/jpeg",
    note = ""
  ): Promise<DeliveryProofEntity> {
    const blobRefKey = `proof_${orderId}_${Date.now()}`;

    let fileSize = 0;
    if (typeof imageBlob === "string") {
      await saveBase64AsBlob(blobRefKey, imageBlob, mimeType);
      fileSize = Math.round((imageBlob.length * 3) / 4);
    } else {
      await saveBlob(blobRefKey, imageBlob);
      fileSize = imageBlob.size;
    }

    const proof: DeliveryProofEntity = {
      id: generateId(),
      orderId,
      imageBlobRef: blobRefKey,
      mimeType,
      fileSize,
      note,
      createdAt: new Date().toISOString(),
      submittedBy,
    };

    const snapshot = loadSnapshot();
    snapshot.deliveryProofs.push(proof);
    saveSnapshot(snapshot);

    // Update order status to delivered
    await this.updateStatus(orderId, "delivered", submittedBy, `Yetkazib berish tasdiqlandi. ${note}`.trim());

    return proof;
  }

  async getDeliveryProof(orderId: string): Promise<DeliveryProofEntity | null> {
    const snapshot = loadSnapshot();
    return snapshot.deliveryProofs.find((p) => p.orderId === orderId) || null;
  }
}

// ----------------------------------------------------
// NOTIFICATION REPOSITORY
// ----------------------------------------------------
export class LocalNotificationRepository implements INotificationRepository {
  async listByUser(userId: string): Promise<InAppNotificationEntity[]> {
    const snapshot = loadSnapshot();
    return snapshot.notifications
      .filter((n) => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(
    notification: Omit<InAppNotificationEntity, "id" | "createdAt" | "isRead">
  ): Promise<InAppNotificationEntity> {
    const snapshot = loadSnapshot();
    const newNotification: InAppNotificationEntity = {
      id: generateId(),
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    snapshot.notifications.push(newNotification);
    saveSnapshot(snapshot);

    syncChannel.broadcast("NOTIFICATION_CREATED", { userId: notification.recipientUserId });

    return newNotification;
  }

  async markAsRead(id: string): Promise<void> {
    const snapshot = loadSnapshot();
    const notif = snapshot.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      saveSnapshot(snapshot);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const snapshot = loadSnapshot();
    for (const notif of snapshot.notifications) {
      if (notif.recipientUserId === userId) {
        notif.isRead = true;
      }
    }
    saveSnapshot(snapshot);
  }
}
