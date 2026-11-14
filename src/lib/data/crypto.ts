/**
 * Cryptographic helpers for TransFlow (Plan A - Demo & Production Ready).
 * Uses Web Crypto API (supported in all modern browsers and Node 18+).
 */

const UNAMBIGUOUS_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 30 characters, no 0/O, 1/I/L

function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== "undefined") {
    return globalThis.crypto;
  }
  throw new Error("Web Crypto API is not available in this environment.");
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hash password using PBKDF2-HMAC-SHA256 with random 16-byte salt (100,000 iterations).
 */
export async function hashPassword(
  password: string,
  existingSalt?: string
): Promise<{ passwordHash: string; salt: string }> {
  const crypto = getCrypto();
  const enc = new TextEncoder();

  let saltBytes: Uint8Array;
  if (existingSalt) {
    saltBytes = hexToBuffer(existingSalt);
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return {
    passwordHash: bufferToHex(derivedBits),
    salt: bufferToHex(saltBytes),
  };
}

/**
 * Verify password against stored hash and salt.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const { passwordHash } = await hashPassword(password, salt);
  if (passwordHash.length !== storedHash.length) return false;
  // Constant-time compare
  let mismatch = 0;
  for (let i = 0; i < passwordHash.length; i++) {
    mismatch |= passwordHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Generates an 8-character human-readable invite code (e.g. "ABCD-2K7M").
 */
export function generateInviteCode(): string {
  const crypto = getCrypto();
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);

  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += UNAMBIGUOUS_CHARS[randomBytes[i] % UNAMBIGUOUS_CHARS.length];
  }

  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

/**
 * Normalizes an invite code: uppercase, strips whitespace and hyphens.
 */
export function normalizeInviteCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Computes SHA-256 hex digest of normalized invite code.
 */
export async function hashInviteCode(code: string): Promise<string> {
  const normalized = normalizeInviteCode(code);
  const crypto = getCrypto();
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(normalized));
  return bufferToHex(hashBuffer);
}

/**
 * Returns a safe preview of the code for lists (e.g. "ABCD-****").
 */
export function formatInviteCodePreview(code: string): string {
  const clean = code.trim().toUpperCase();
  if (clean.length < 4) return "****";
  const prefix = clean.replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return `${prefix}-****`;
}
