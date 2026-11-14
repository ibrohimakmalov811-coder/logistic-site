import crypto from "crypto";

/**
 * Creates a salted SHA-256 hash of an IP address for abuse prevention and forensics
 * without storing personal identifying data in plain text.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "logistika_uz_secure_salt_2026";
  return crypto.createHash("sha256").update(`${ip}_${salt}`).digest("hex");
}

/**
 * Computes a deterministic SHA-256 hex digest for storing secret invite codes securely.
 */
export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value.trim()).digest("hex");
}

const INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates an 8-character ambiguous-char-free invite code formatted as XXXX-XXXX.
 */
export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += INVITE_ALPHABET[bytes[i]! % INVITE_ALPHABET.length];
    if (i === 3) out += "-";
  }
  return out;
}

/**
 * Masks an invite code so logs and UI tables never store/expose the raw secret after issuance.
 */
export function maskInviteCode(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length < 4) return "INV-****";
  return `TF-****-${clean.slice(-3)}`;
}
