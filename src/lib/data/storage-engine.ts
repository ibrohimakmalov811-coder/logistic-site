import { StorageSnapshot } from "./types";

export const STORAGE_KEY = "transflow_data_v1";
export const STORAGE_VERSION = 1;

export function createInitialSnapshot(): StorageSnapshot {
  return {
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    users: [],
    credentials: [],
    sessions: [],
    companies: [],
    memberships: [],
    invites: [],
    vehicles: [],
    driverProfiles: [],
    orders: [],
    orderStatusHistory: [],
    deliveryProofs: [],
    notifications: [],
    onboardingDrafts: [],
  };
}

let inMemorySnapshot: StorageSnapshot = createInitialSnapshot();

function isClient(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function sanitizeUser(u: any): any {
  if (u && typeof u === "object") {
    const { citizenship, residenceCountry, ...rest } = u;
    return rest;
  }
  return u;
}

/**
 * Loads the current storage snapshot.
 * Recovers automatically if corrupted JSON is found.
 */
export function loadSnapshot(): StorageSnapshot {
  if (!isClient()) {
    return inMemorySnapshot;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialSnapshot();
      saveSnapshot(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.version !== STORAGE_VERSION) {
      console.warn("TransFlow storage version mismatch or invalid shape. Upgrading snapshot...");
      // Migration hook: ensure all array fields exist and strip sensitive/deprecated fields
      const migrated: StorageSnapshot = {
        version: STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        users: Array.isArray(parsed.users) ? parsed.users.map(sanitizeUser) : [],
        credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        companies: Array.isArray(parsed.companies) ? parsed.companies : [],
        memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
        invites: Array.isArray(parsed.invites) ? parsed.invites : [],
        vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
        driverProfiles: Array.isArray(parsed.driverProfiles) ? parsed.driverProfiles : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        orderStatusHistory: Array.isArray(parsed.orderStatusHistory) ? parsed.orderStatusHistory : [],
        deliveryProofs: Array.isArray(parsed.deliveryProofs) ? parsed.deliveryProofs : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        onboardingDrafts: Array.isArray(parsed.onboardingDrafts) ? parsed.onboardingDrafts : [],
      };
      saveSnapshot(migrated);
      return migrated;
    }

    // Ensure all arrays are present in case a prior version missed any
    const validated: StorageSnapshot = {
      version: STORAGE_VERSION,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      users: Array.isArray(parsed.users) ? parsed.users.map(sanitizeUser) : [],
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      driverProfiles: Array.isArray(parsed.driverProfiles) ? parsed.driverProfiles : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      orderStatusHistory: Array.isArray(parsed.orderStatusHistory) ? parsed.orderStatusHistory : [],
      deliveryProofs: Array.isArray(parsed.deliveryProofs) ? parsed.deliveryProofs : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      onboardingDrafts: Array.isArray(parsed.onboardingDrafts) ? parsed.onboardingDrafts : [],
    };

    return validated;
  } catch (err) {
    console.error("TransFlow storage corruption detected. Attempting recovery...", err);
    try {
      const corruptRaw = window.localStorage.getItem(STORAGE_KEY);
      if (corruptRaw) {
        window.localStorage.setItem(`transflow_corrupt_backup_${Date.now()}`, corruptRaw);
      }
    } catch {
      // Ignore backup error
    }
    const fresh = createInitialSnapshot();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore
    }
    return fresh;
  }
}

/**
 * Saves snapshot to localStorage with QuotaExceeded fallback protection.
 */
export function saveSnapshot(snapshot: StorageSnapshot): void {
  snapshot.updatedAt = new Date().toISOString();
  inMemorySnapshot = snapshot;

  if (!isClient()) {
    return;
  }

  try {
    const raw = JSON.stringify(snapshot);
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch (err: unknown) {
    // Check for QuotaExceededError
    const isQuota =
      err instanceof DOMException &&
      (err.code === 22 ||
        err.code === 1014 ||
        err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED");

    if (isQuota) {
      console.warn("LocalStorage quota exceeded. Pruning old notifications and status history...");
      // Auto-prune notifications to newest 20
      if (snapshot.notifications.length > 20) {
        snapshot.notifications = snapshot.notifications
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20);
      }
      // Prune history to newest 100 entries
      if (snapshot.orderStatusHistory.length > 100) {
        snapshot.orderStatusHistory = snapshot.orderStatusHistory
          .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
          .slice(0, 100);
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        return;
      } catch (retryErr) {
        console.error("Failed to save even after pruning:", retryErr);
        throw new Error(
          "Brauzer xotirasi (localStorage) to'ldi. Iltimos demo ma'lumotlarni tozalang yoki eski yozuvlarni o'chiring."
        );
      }
    }

    throw err;
  }
}

/**
 * Resets storage back to empty initial snapshot.
 */
export function resetSnapshot(): StorageSnapshot {
  const fresh = createInitialSnapshot();
  saveSnapshot(fresh);
  return fresh;
}

/**
 * Exports snapshot as JSON string.
 */
export function exportSnapshotJson(): string {
  const snapshot = loadSnapshot();
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Imports and validates snapshot from JSON string.
 */
export function importSnapshotJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== "object") return false;
    const migrated: StorageSnapshot = {
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      users: Array.isArray(parsed.users) ? parsed.users : [],
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      driverProfiles: Array.isArray(parsed.driverProfiles) ? parsed.driverProfiles : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      orderStatusHistory: Array.isArray(parsed.orderStatusHistory) ? parsed.orderStatusHistory : [],
      deliveryProofs: Array.isArray(parsed.deliveryProofs) ? parsed.deliveryProofs : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      onboardingDrafts: Array.isArray(parsed.onboardingDrafts) ? parsed.onboardingDrafts : [],
    };
    saveSnapshot(migrated);
    return true;
  } catch (e) {
    console.error("Failed to import snapshot JSON:", e);
    return false;
  }
}
