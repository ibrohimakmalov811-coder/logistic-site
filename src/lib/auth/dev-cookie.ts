import type { UserRole } from "@/types/database";

export const DEV_SESSION_COOKIE_NAME = "tf_dev_session";

export interface DevSessionCookiePayload {
  sid: string;
  uid: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  aal: "aal1" | "aal2";
  hasMfa: boolean;
  lastAuthAt: number;
  exp: number;
}

function assertNotProduction(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[SECURITY] Dev session cookie utility is forbidden in production.");
  }
}

function getSecretString(): string {
  assertNotProduction();
  return (
    process.env.AUTH_DEV_SECRET ||
    "transflow-local-dev-sandbox-secret-not-for-production"
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecretString()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signDevSessionCookie(
  payload: DevSessionCookiePayload
): Promise<string> {
  assertNotProduction();
  const enc = new TextEncoder();
  const json = JSON.stringify(payload);
  const dataB64 = bytesToBase64Url(enc.encode(json));
  const key = await importHmacKey();
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataB64));
  const sigB64 = bytesToBase64Url(new Uint8Array(sigBuffer));
  return `${dataB64}.${sigB64}`;
}

export async function verifyDevSessionCookie(
  token: string | undefined | null
): Promise<DevSessionCookiePayload | null> {
  if (process.env.NODE_ENV === "production" || !token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [dataB64, sigB64] = parts;
  if (!dataB64 || !sigB64) {
    return null;
  }

  try {
    const enc = new TextEncoder();
    const key = await importHmacKey();
    const sigBytes = base64UrlToBytes(sigB64);
    const sigCopy = new Uint8Array(sigBytes.length);
    sigCopy.set(sigBytes);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigCopy,
      enc.encode(dataB64)
    );
    if (!valid) {
      return null;
    }

    const decoded = new TextDecoder().decode(base64UrlToBytes(dataB64));
    const parsed = JSON.parse(decoded) as DevSessionCookiePayload;
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
