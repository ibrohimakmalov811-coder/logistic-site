"use client";

import * as React from "react";
import {
  CompanyEntity,
  DriverProfileEntity,
  MembershipEntity,
  UserEntity,
  UserRole,
  UserSessionEntity,
} from "./types";
import {
  companyRepo,
  loadSnapshot,
  seedDemoData,
  userRepo,
} from "./index";
import { syncChannel } from "./sync-channel";
import { verifyPassword } from "./crypto";

interface TransFlowAuthContextValue {
  currentUser: UserEntity | null;
  currentCompany: CompanyEntity | null;
  membership: MembershipEntity | null;
  driverProfile: DriverProfileEntity | null;
  currentSession: UserSessionEntity | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchDemoUser: (role: UserRole) => Promise<void>;
  refresh: () => Promise<void>;
}

const TransFlowAuthContext = React.createContext<TransFlowAuthContextValue | null>(null);

const SESSION_STORAGE_KEY = "tf_tab_session_id";

export function TransFlowAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<UserEntity | null>(null);
  const [currentCompany, setCurrentCompany] = React.useState<CompanyEntity | null>(null);
  const [membership, setMembership] = React.useState<MembershipEntity | null>(null);
  const [driverProfile, setDriverProfile] = React.useState<DriverProfileEntity | null>(null);
  const [currentSession, setCurrentSession] = React.useState<UserSessionEntity | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadUserData = React.useCallback(async () => {
    try {
      if (typeof window === "undefined") return;

      // Ensure demo seed data exists if storage is empty
      const snapshot = loadSnapshot();
      if (snapshot.users.length === 0) {
        await seedDemoData();
      }

      // 1. Resolve session: Check tab's sessionStorage first (allows 2 tabs logged in as different users)
      let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionId) {
        // Fallback to localStorage session pointer
        sessionId = window.localStorage.getItem("transflow_session_id");
      }

      // If still no session, check if any user exists to set a default demo session
      if (!sessionId) {
        const defaultOwner = snapshot.users.find((u) => u.role === "company_owner") || snapshot.users[0];
        if (defaultOwner) {
          const newSession = await userRepo.createSession(defaultOwner.id, defaultOwner.role);
          sessionId = newSession.sessionId;
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        }
      }

      if (!sessionId) {
        setCurrentUser(null);
        setCurrentCompany(null);
        setMembership(null);
        setDriverProfile(null);
        setCurrentSession(null);
        setIsLoading(false);
        return;
      }

      const session = await userRepo.getSession(sessionId);
      if (!session) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setCurrentUser(null);
        setCurrentCompany(null);
        setMembership(null);
        setDriverProfile(null);
        setCurrentSession(null);
        setIsLoading(false);
        return;
      }

      // Keep cookies and storage in sync
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
      window.localStorage.setItem("transflow_session_id", session.sessionId);
      document.cookie = `tf_session=${session.sessionId}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `tf_auth_user=${session.userId}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `tf_auth_role=${session.role}; path=/; max-age=604800; SameSite=Lax`;

      const user = await userRepo.findById(session.userId);
      if (!user) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      const company = await companyRepo.findByUserId(user.id);
      const snap = loadSnapshot();
      const userMembership =
        snap.memberships.find((m) => m.userId === user.id && m.isActive) || null;
      const profile = user.role === "driver" ? await companyRepo.getDriverProfile(user.id) : null;

      setCurrentUser(user);
      setCurrentCompany(company);
      setMembership(userMembership);
      setDriverProfile(profile);
      setCurrentSession(session);
    } catch (err) {
      console.error("TransFlowAuthProvider load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUserData();

    // Subscribe to multi-tab sync channel
    const unsubscribe = syncChannel.subscribe((msg) => {
      if (
        msg.type === "STORAGE_RESET" ||
        msg.type === "INVITE_REDEEMED" ||
        msg.type === "ORDER_STATUS_CHANGED"
      ) {
        loadUserData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadUserData]);

  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const raw = identifier.trim();
    let user: UserEntity | null = null;
    if (raw.includes("@")) {
      user = await userRepo.findByEmail(raw);
    } else {
      user = await userRepo.findByPhone(raw);
    }

    if (!user) {
      return { success: false, error: "Foydalanuvchi topilmadi." };
    }

    const creds = await userRepo.getCredentials(user.id);
    if (!creds) {
      return { success: false, error: "Tizimga kirish ma'lumotlari mavjud emas." };
    }

    const valid = await verifyPassword(password, creds.passwordHash, creds.salt);
    if (!valid) {
      return { success: false, error: "Telefon/email yoki parol noto'g'ri." };
    }

    const session = await userRepo.createSession(user.id, user.role);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
    await loadUserData();

    return { success: true };
  };

  const logout = async (): Promise<void> => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem("transflow_session_id");
      document.cookie = "tf_session=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "tf_auth_user=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "tf_auth_role=; path=/; max-age=0; SameSite=Lax";
    }
    setCurrentUser(null);
    setCurrentCompany(null);
    setMembership(null);
    setDriverProfile(null);
    setCurrentSession(null);
  };

  const switchDemoUser = async (targetRole: UserRole): Promise<void> => {
    const snapshot = loadSnapshot();
    const candidate = snapshot.users.find((u) => u.role === targetRole);
    if (!candidate) {
      console.warn(`No user found with role ${targetRole}. Reseeding demo...`);
      await seedDemoData();
      const freshSnap = loadSnapshot();
      const reseeded = freshSnap.users.find((u) => u.role === targetRole);
      if (reseeded) {
        const session = await userRepo.createSession(reseeded.id, reseeded.role);
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
        await loadUserData();
      }
      return;
    }

    const session = await userRepo.createSession(candidate.id, candidate.role);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
    await loadUserData();
  };

  return (
    <TransFlowAuthContext.Provider
      value={{
        currentUser,
        currentCompany,
        membership,
        driverProfile,
        currentSession,
        isLoading,
        login,
        logout,
        switchDemoUser,
        refresh: loadUserData,
      }}
    >
      {children}
    </TransFlowAuthContext.Provider>
  );
}

export function useTransFlowAuth(): TransFlowAuthContextValue {
  const context = React.useContext(TransFlowAuthContext);
  if (!context) {
    throw new Error("useTransFlowAuth must be used within a TransFlowAuthProvider");
  }
  return context;
}
