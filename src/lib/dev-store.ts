import crypto from "crypto";
import fs from "fs";
import path from "path";
import type {
  AppLocale,
  AuditLogRow,
  CompanyMemberRow,
  CompanyRow,
  DataRequestRow,
  DeliveryProofRow,
  DriverProfileRow,
  InviteRow,
  OrderRow,
  OrderStatusHistoryRow,
  ProfileRow,
  UserRole,
  VehicleRow,
} from "@/types/database";
import type { OnboardingDraftInput } from "@/lib/validations/onboarding";

export interface DevUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  role: UserRole;
  totpSecret: string | null;
  totpVerified: boolean;
  onboardingDraft: OnboardingDraftInput | null;
  createdAt: string;
}

export interface DevDatabaseState {
  users: DevUserRecord[];
  profiles: ProfileRow[];
  companies: CompanyRow[];
  companyMembers: CompanyMemberRow[];
  invites: InviteRow[];
  vehicles: VehicleRow[];
  driverProfiles: DriverProfileRow[];
  orders: OrderRow[];
  orderStatusHistory: OrderStatusHistoryRow[];
  deliveryProofs: DeliveryProofRow[];
  /** Base64 image data stored ONLY in local dev sandbox instead of Supabase Storage */
  devProofFiles: Record<string, { mimeType: string; base64: string }>;
  auditLogs: AuditLogRow[];
  dataRequests: DataRequestRow[];
  /** Pending password reset tokens mapped by sha256(token) -> { userId, expiresAt } */
  resetTokens: Array<{ tokenHash: string; userId: string; expiresAt: string }>;
  /** Pending email verify tokens mapped by sha256(token) -> { userId, expiresAt } */
  verifyTokens: Array<{ tokenHash: string; userId: string; expiresAt: string }>;
}

function assertDevOnly(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[SECURITY CRITICAL] Attempted to access dev fallback store in production."
    );
  }
}

const DEV_DB_PATH = path.join(process.cwd(), ".next", "cache", "transflow-dev-db.json");

declare global {
  var __TRANSFLOW_DEV_DB__: DevDatabaseState | undefined;
}

function emptyState(): DevDatabaseState {
  return {
    users: [],
    profiles: [],
    companies: [],
    companyMembers: [],
    invites: [],
    vehicles: [],
    driverProfiles: [],
    orders: [],
    orderStatusHistory: [],
    deliveryProofs: [],
    devProofFiles: {},
    auditLogs: [],
    dataRequests: [],
    resetTokens: [],
    verifyTokens: [],
  };
}

export function getDevDb(): DevDatabaseState {
  assertDevOnly();

  if (globalThis.__TRANSFLOW_DEV_DB__) {
    return globalThis.__TRANSFLOW_DEV_DB__;
  }

  try {
    if (fs.existsSync(DEV_DB_PATH)) {
      const raw = fs.readFileSync(DEV_DB_PATH, "utf8");
      const parsed = JSON.parse(raw) as DevDatabaseState;
      globalThis.__TRANSFLOW_DEV_DB__ = { ...emptyState(), ...parsed };
      return globalThis.__TRANSFLOW_DEV_DB__;
    }
  } catch {
    // Fall back to clean memory store
  }

  globalThis.__TRANSFLOW_DEV_DB__ = emptyState();
  return globalThis.__TRANSFLOW_DEV_DB__;
}

export function saveDevDb(): void {
  assertDevOnly();
  const db = getDevDb();
  try {
    fs.mkdirSync(path.dirname(DEV_DB_PATH), { recursive: true });
    fs.writeFileSync(DEV_DB_PATH, JSON.stringify(db), "utf8");
  } catch {
    // Non-fatal in dev sandbox
  }
}

export function resetDevDb(): void {
  assertDevOnly();
  globalThis.__TRANSFLOW_DEV_DB__ = emptyState();
  saveDevDb();
}

export function hashDevPassword(password: string): string {
  assertDevOnly();
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyDevPassword(password: string, stored: string): boolean {
  assertDevOnly();
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

// ---------------------------------------------------------------------------
// RFC 6238 TOTP helpers for realistic dev-mode MFA
// ---------------------------------------------------------------------------
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(bytesLength = 20): string {
  assertDevOnly();
  const bytes = crypto.randomBytes(bytesLength);
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 1) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function computeTotpCode(secretBase32: string, stepOffset = 0): string {
  assertDevOnly();
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(codeInt % 1_000_000).padStart(6, "0");
}

export function verifyDevTotpCode(secretBase32: string, code: string): boolean {
  assertDevOnly();
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;
  for (const offset of [-1, 0, 1]) {
    if (computeTotpCode(secretBase32, offset) === trimmed) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a deterministic decorative SVG QR-style preview data URL for dev mode
 * along with the standard otpauth:// URI so developers can test TOTP manually.
 */
export function buildDevTotpQrDataUrl(secretBase32: string, label: string): string {
  assertDevOnly();
  const hash = crypto.createHash("sha256").update(`${secretBase32}:${label}`).digest();
  const cells = 21;
  const size = 168;
  const cell = size / cells;
  let rects = "";

  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);

  for (let r = 0; r < cells; r += 1) {
    for (let c = 0; c < cells; c += 1) {
      let on = false;
      if (isFinder(r, c)) {
        const lr = r >= cells - 7 ? r - (cells - 7) : r;
        const lc = c >= cells - 7 ? c - (cells - 7) : c;
        on =
          lr === 0 ||
          lr === 6 ||
          lc === 0 ||
          lc === 6 ||
          (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      } else {
        const bitIdx = (r * cells + c) % (hash.length * 8);
        on = ((hash[Math.floor(bitIdx / 8)] >> (bitIdx % 8)) & 1) === 1;
      }
      if (on) {
        rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#0F172A"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#FFFFFF"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export function normalizeLocale(val?: string | null): AppLocale {
  if (val === "ru" || val === "en" || val === "uz") return val;
  return "uz";
}
