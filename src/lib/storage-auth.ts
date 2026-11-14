/**
 * Client-side pure localStorage storage and session management.
 * Strictly operates without backend, external DB, or APIs.
 */

export type UserRole = "company_owner" | "dispatcher" | "driver";

export interface UserActivity {
  id: string;
  type: "order" | "request" | "action" | "login" | "profile_update";
  title: string;
  description: string;
  timestamp: string;
  status?: "pending" | "in_transit" | "completed" | "delivered" | "cancelled" | "success";
  metadata?: Record<string, string | number>;
}

export interface LocalUser {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: UserRole;
  citizenship?: string;
  residenceCountry?: string;
  password: string;
  avatar: string | null;
  createdAt: string;
  activities: UserActivity[];
}

export interface CurrentSession {
  userId: string;
  email: string;
  loggedInAt: string;
}

const STORAGE_KEY_USERS = "tf_users";
const STORAGE_KEY_SESSION = "tf_current_session";
export const AUTH_COOKIE_NAME = "tf_auth_user";

function isClient(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setAuthCookie(userId: string): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const isHttps =
    typeof window !== "undefined" &&
    Boolean(window.location) &&
    window.location.protocol === "https:";
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
    userId
  )}; path=/; max-age=${maxAge}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function getLocalUsers(): LocalUser[] {
  if (!isClient()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[Storage] Failed to parse local users", err);
    return [];
  }
}

export function saveLocalUsers(users: LocalUser[]): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (err) {
    console.error("[Storage] Failed to save local users", err);
  }
}

function normalizePhone(p: string): string {
  return p.replace(/[^\d+]/g, "").trim();
}

function getPhoneDigits9(p: string): string {
  const d = p.replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : d;
}

export function findUserByEmailOrPhone(identifier: string): LocalUser | null {
  const users = getLocalUsers();
  const raw = identifier.trim();
  const rawLower = raw.toLowerCase();
  const normPhone = normalizePhone(raw);
  const cleanDigits = getPhoneDigits9(raw);

  return (
    users.find((u) => {
      const uEmail = (u.email || "").trim().toLowerCase();
      const uPhone = normalizePhone(u.phone || "");
      const uPhoneDigits = getPhoneDigits9(u.phone || "");

      if (uEmail && uEmail === rawLower) return true;
      if (uPhone && uPhone === normPhone) return true;
      if (cleanDigits.length === 9 && cleanDigits === uPhoneDigits) {
        return true;
      }
      return false;
    }) || null
  );
}

export function registerUser(data: {
  fullName: string;
  phone: string;
  email: string;
  role: UserRole;
  citizenship?: string;
  residenceCountry?: string;
  password: string;
}): { success: boolean; error?: string; user?: LocalUser } {
  if (!isClient()) {
    return { success: false, error: "CLIENT_ONLY" };
  }

  const users = getLocalUsers();
  const normEmail = data.email.trim().toLowerCase();
  const normPhone = normalizePhone(data.phone);
  const phoneDigits9 = getPhoneDigits9(data.phone);

  const existingEmail = users.some(
    (u) => (u.email || "").trim().toLowerCase() === normEmail
  );
  if (existingEmail) {
    return { success: false, error: "EMAIL_EXISTS" };
  }

  const existingPhone = users.some((u) => {
    const uPhone = normalizePhone(u.phone || "");
    const uDigits9 = getPhoneDigits9(u.phone || "");
    return uPhone === normPhone || (phoneDigits9.length === 9 && phoneDigits9 === uDigits9);
  });
  if (existingPhone) {
    return { success: false, error: "PHONE_EXISTS" };
  }

  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Initial user activity history (personalized with user-specific suffix)
  const userSuffix = id.slice(-4).toUpperCase();
  const initialActivities: UserActivity[] = [
    {
      id: `act_${Date.now()}_1`,
      type: "action",
      title: "Akkount yaratildi",
      description: "Platformada yangi profil muvaffaqiyatli ro'yxatdan o'tkazildi.",
      timestamp: now,
      status: "success",
    },
    {
      id: `act_${Date.now()}_2`,
      type: "request",
      title: "Boshlang'ich tizim sozlamalari",
      description: "Logistika profili va xavfsizlik parametrlari faollashtirildi.",
      timestamp: now,
      status: "completed",
    },
    {
      id: `act_${Date.now()}_3`,
      type: "order",
      title: `Namuna buyurtma #TRK-${userSuffix}`,
      description: "Toshkent → Samarqand yo'nalishidagi 5 tonnalik sinov reysi.",
      timestamp: now,
      status: "in_transit",
    },
  ];

  const newUser: LocalUser = {
    id,
    fullName: data.fullName.trim(),
    phone: normPhone,
    email: normEmail,
    role: data.role,
    citizenship: (data.citizenship || "").trim() || "O'zbekiston",
    residenceCountry: (data.residenceCountry || "").trim() || "O'zbekiston",
    password: data.password,
    avatar: null,
    createdAt: now,
    activities: initialActivities,
  };

  users.push(newUser);
  saveLocalUsers(users);

  return { success: true, user: newUser };
}

export function loginUser(
  identifier: string,
  password: string
): { success: boolean; error?: string; user?: LocalUser } {
  if (!isClient()) {
    return { success: false, error: "CLIENT_ONLY" };
  }

  const user = findUserByEmailOrPhone(identifier);
  if (!user || user.password !== password) {
    return { success: false, error: "INVALID_CREDENTIALS" };
  }

  const session: CurrentSession = {
    userId: user.id,
    email: user.email,
    loggedInAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    setAuthCookie(user.id);

    // Record login activity
    addUserActivity(user.id, {
      type: "login",
      title: "Tizimga kirildi",
      description: "Foydalanuvchi shaxsiy kabinetiga muvaffaqiyatli kirdi.",
      status: "success",
    });
  } catch (err) {
    console.error("[Storage] Failed to save session", err);
  }

  return { success: true, user };
}

export function getCurrentSession(): CurrentSession | null {
  if (!isClient()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.userId === "string") {
      return parsed as CurrentSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): LocalUser | null {
  const session = getCurrentSession();
  if (!session) return null;
  const users = getLocalUsers();
  return users.find((u) => u.id === session.userId) || null;
}

export function logoutUser(): void {
  if (!isClient()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_SESSION);
    clearAuthCookie();
  } catch (err) {
    console.error("[Storage] Failed to logout", err);
  }
}

export function addUserActivity(
  userId: string,
  activity: Omit<UserActivity, "id" | "timestamp">
): UserActivity | null {
  if (!isClient()) return null;
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;

  const newActivity: UserActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...activity,
  };

  users[idx].activities = [newActivity, ...(users[idx].activities || [])];
  saveLocalUsers(users);
  return newActivity;
}

export function updateUserAvatar(userId: string, avatarBase64: string): boolean {
  if (!isClient()) return false;
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;

  users[idx].avatar = avatarBase64;
  users[idx].activities = [
    {
      id: `act_${Date.now()}_av`,
      type: "profile_update",
      title: "Profil rasmi yangilandi",
      description: "Yangi shaxsiy avatar surati saqlandi.",
      timestamp: new Date().toISOString(),
      status: "success",
    },
    ...(users[idx].activities || []),
  ];

  saveLocalUsers(users);
  return true;
}
