# Security Policy & Hardening Guide

> **Security Philosophy:** No framework or library is secure by itself. Real web security is built in layers (defense in depth). For an early-stage B2B SaaS landing page, the public attack surface is small, but the critical risks are:
> 1. Form abuse (spam, DDoS, automated bots, database exhaustion, SQL/script injection).
> 2. Account compromise (takeover of GitHub, Vercel, Supabase, Upstash, Cloudflare, or domain DNS).

---

## 1. Applied Technical Security Layers

### A. Strict Content Security Policy (CSP) with Nonces
- Generated dynamically per request in `src/middleware.ts` using cryptographically secure random nonces (`crypto.randomUUID()`).
- No `'unsafe-inline'` for script execution in production.
- Allows only explicit, necessary origins:
  - Scripts: `'self'`, dynamic nonce, Cloudflare Turnstile (`https://challenges.cloudflare.com`).
  - Connect: `'self'`, Cloudflare Turnstile, Supabase endpoints, Upstash Redis endpoints.
  - Frames: `'none'` for outside embedders; `https://challenges.cloudflare.com` for Turnstile challenge iframe.

### B. HTTP Response Headers
The following headers are enforced via `next.config.ts` and `src/middleware.ts`:
- **Strict-Transport-Security (HSTS):** `max-age=63072000; includeSubDomains; preload` (enforces HTTPS only).
- **X-Content-Type-Options:** `nosniff` (prevents MIME-type sniffing attacks).
- **X-Frame-Options:** `DENY` (guards against clickjacking).
- **Referrer-Policy:** `strict-origin-when-cross-origin` (prevents path leakage in referrer headers).
- **Permissions-Policy:** `camera=(), microphone=(), geolocation=(), browsing-topics=()` (disables unused browser sensor APIs).
- **Cross-Origin-Opener-Policy (COOP):** `same-origin` (isolates browsing context).
- **Cross-Origin-Resource-Policy (CORP):** `same-origin` (prevents unauthorized cross-origin resource embedding).
- **X-Powered-By:** Disabled to prevent disclosing Next.js engine metadata.

### C. Input Validation & Output Encoding
- **Client & Server Schema Parity:** Validated strictly on both sides using the same Zod schema (`src/lib/validations/waitlist.ts`).
- **Server Authority:** Client-side validation is strictly treated as UX guidance; the server re-validates and normalizes all fields independently.
- **Sanitization & Escaping:** React automatically escapes string outputs; `dangerouslySetInnerHTML` is explicitly disallowed across the application.
- **Phone Number Normalization:** Restricts phone input to legitimate Uzbekistan operators (`+998` followed by valid mobile/landline prefixes).

### D. Abuse & Bot Mitigation
- **Cloudflare Turnstile:** Server-side token verification (`src/lib/turnstile.ts`) prevents automated headless bots from filling the waitlist form.
- **Upstash Redis Rate Limiting:** Sliding-window rate limit (5 requests per 10 minutes per IP address) halts brute-force and request flooding.
- **Honeypot Trap:** Hidden decoy field `hp_company_website`. Automated scrapers that fill this field receive a silent dummy response, protecting database capacity.
- **Privacy-Preserving IP Hashing:** Client IP addresses are hashed using SHA-256 before storage to ensure auditability while respecting privacy regulations.

### E. Database Security, Auth & Storage Isolation (Supabase & Postgres RLS)
- **Strict Multi-Tenant RLS Enabled Across All 12 Tables:** Verified by `supabase/tests/rls_verification.sql`.
  - `waitlist`: `anon` role can **ONLY INSERT**; reading, updating, or deleting is blocked.
  - **Server-Only Role Assignment:** Roles (`company_owner`, `dispatcher`, `driver`) are stored in `auth.users.raw_app_meta_data` and `profiles.role`, guarded by database trigger `guard_profile_immutable_columns` so client sessions cannot escalate roles.
  - **Tenant & Driver Isolation:** Owners/dispatchers see only their own `company_id` records; drivers see ONLY orders assigned to `assigned_driver_id = auth.uid()`.
  - **Private Delivery Proofs:** Proof photos upload through a server action that validates magic bytes (`JPEG`/`PNG`/`WEBP`), limits size (`<= 5 MB`), strips hidden EXIF/GPS metadata via `sharp`, stores in the private `delivery-proofs` bucket, and serves only short-lived signed URLs.
  - **Single-Use Hashed Invites:** Invite codes are stored as SHA-256 hashes with 72h expiry and atomic single-use claiming.
  - **Mandatory TOTP MFA for Managers:** `company_owner` and `dispatcher` require AAL2 TOTP MFA before entering `/app/company/*`.
  - **Open-Redirect & Dev-Fallback Guards:** Return URLs go through strict relative allowlist validation (`sanitizeRedirectPath`); the local memory dev sandbox throws immediately in `NODE_ENV === "production"`.
- Parameterized queries eliminate SQL injection vulnerabilities.

---

## 2. Project Owner Security Checklist (Action Items)

### Step 1: Enable Two-Factor Authentication (2FA / MFA)
Enable 2FA using a hardware key (YubiKey) or an authenticator app (Google Authenticator, 1Password) on **every** service:
- [ ] **GitHub:** Settings > Password and authentication > Two-factor authentication.
- [ ] **Vercel:** Account Settings > Login Connections > Two-Factor Authentication.
- [ ] **Supabase:** Account Settings > Security > Enable Multi-Factor Authentication.
- [ ] **Upstash:** Account Console > Security Settings > Multi-Factor Authentication.
- [ ] **Cloudflare:** Profile > Authentication > Two-Factor Authentication.

*Why it matters:* If an attacker compromises your email or password via a credential leak, 2FA prevents unauthorized account access.

### Step 2: Use Unique, Strong Passwords
- [ ] Never reuse passwords across platforms. Use a reputable password manager (1Password, Bitwarden) to generate 24+ character random passwords.

### Step 3: Cloudflare DNS, WAF & Bot Management
- [ ] Set DNS records to **Proxied (Orange Cloud)** in Cloudflare.
- [ ] In Cloudflare SSL/TLS settings, set mode to **Full (Strict)**.
- [ ] Under Cloudflare Security > WAF: enable default managed rules and Bot Fight Mode.

*Why it matters:* Hides the origin Vercel/server IP address, protects against volumetric DDoS attacks, and blocks malicious web crawlers before they reach the application.

### Step 4: Secret Management & Git Hygiene
- [ ] Never commit `.env`, `.env.local`, or API keys to GitHub.
- [ ] Only enter real production keys in the Vercel Project Settings environment variables dashboard.
- [ ] Rotate keys immediately if an accidental exposure occurs.

---

## 3. Vulnerability Reporting

If you discover a security vulnerability in this project, please notify the platform administrator at `contact@logistika.uz` (or your configured security email) instead of opening a public GitHub issue.
