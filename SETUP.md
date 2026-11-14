# Step-by-Step Setup & Deployment Guide

This guide provides numbered, beginner-friendly instructions for the project owner to connect all external services and deploy the platform to production.

---

## Overview of External Services
The application integrates with 5 standard cloud services. You will create free-tier or production accounts for:
1. **GitHub** (source code repository)
2. **Supabase** (Postgres database with Row Level Security for waitlist signups)
3. **Upstash Redis** (serverless rate limiting to block spammers)
4. **Cloudflare Turnstile** (privacy-friendly, CAPTCHA-free bot protection)
5. **Vercel** (Next.js hosting & continuous deployment)

---

## Step 1: Create a GitHub Repository and Push Code

1. Log in to [GitHub](https://github.com/) and click **New repository**.
2. Name the repository (e.g. `logistika-uz`), select **Private** or **Public**, and click **Create repository**.
3. In your local terminal inside `c:\Users\user\Desktop\logistika`:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production-ready logistics landing page"
   git branch -M main
   git remote add origin https://github.com/<your-username>/logistika-uz.git
   git push -u origin main
   ```

---

## Step 2: Create a Supabase Project & Execute SQL Migration

1. Go to [Supabase](https://supabase.com/) and click **New Project**.
2. Enter your project name (e.g. `logistika-prod`) and choose a database region (Frankfurt or nearest).
3. Once the database is provisioned, go to **Project Settings > API**:
   - Copy **Project URL** → this will be `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy **anon / public key** → this will be `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy **service_role secret** → this will be `SUPABASE_SERVICE_ROLE_KEY`.
4. Open the **SQL Editor** tab from the left sidebar in Supabase, click **New query**, and run all migrations in chronological order:
   1. `supabase/migrations/20261111_create_waitlist_table.sql`
   2. `supabase/migrations/20261112_01_platform_schema.sql`
   3. `supabase/migrations/20261112_02_rls_and_storage.sql`
5. Verify RLS policies cleanly by running `supabase/tests/rls_verification.sql` in the SQL Editor (wrapped in a rolled-back transaction).
6. Under **Authentication > URL Configuration**, add your Site URL (`https://your-domain.uz`) and Redirect URL (`https://your-domain.uz/auth/callback` and `http://localhost:3000/auth/callback`).
7. Under **Authentication > Multi-Factor Authentication**, ensure **TOTP** is enabled.
8. Paste the custom templates from `supabase/templates/` (`confirm_signup.html`, `reset_password.html`, `invite_notice.html`) into **Authentication > Email Templates**.
9. Generate `IP_HASH_SALT` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) and add all production env vars from `.env.example` into Vercel.

---

## Step 3: Create Upstash Redis (Rate Limiting)

1. Go to [Upstash Console](https://console.upstash.com/) and create a free account.
2. Under the **Redis** tab, click **Create Database**.
3. Name it `logistika-ratelimit`, choose the region closest to your Vercel deployment, and click **Create**.
4. Scroll down to the **REST API** section:
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

---

## Step 4: Create Cloudflare Turnstile Site (Bot Protection)

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Turnstile** in the left menu.
2. Click **Add Site**:
   - **Site name:** `Logistika Waitlist`
   - **Domain:** enter `localhost` (for testing) and your actual production domain (e.g. `logistika.uz`).
   - **Widget Mode:** Managed (recommended).
3. Click **Create**:
   - Copy the **Site Key** → this will be `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
   - Copy the **Secret Key** → this will be `TURNSTILE_SECRET_KEY`.

---

## Step 5: Configure Environment Variables in Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Import your GitHub repository (`logistika-uz`).
3. Under **Environment Variables**, add the following keys and paste the values copied in Steps 2–4:

| Variable Name | Description | Where to find it |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | Set to `production` |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL | e.g. `https://logistika.uz` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile public key | Cloudflare > Turnstile > Site Key |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key | Cloudflare > Turnstile > Secret Key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Supabase > Project Settings > API > anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service secret | Supabase > Project Settings > API > service_role |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Upstash > Redis > REST API section |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | Upstash > Redis > REST API section |

---

## Step 6: Deploy to Vercel

1. In the Vercel project setup screen, click **Deploy**.
2. Vercel will install dependencies via pnpm and run `next build`.
3. In approximately 60 seconds, your site will be live on a `*.vercel.app` preview domain.

---

## Step 7: Connect Custom Domain & Cloudflare DNS

1. In Vercel, navigate to **Settings > Domains** and add your custom domain (e.g. `logistika.uz`).
2. Go to your Cloudflare DNS dashboard and add the records specified by Vercel:
   - `CNAME` for `www` pointing to `cname.vercel-dns.com`
   - `A` record for `@` (root) pointing to `76.76.21.21` (or proxied through Cloudflare).
3. In Cloudflare, set SSL/TLS encryption mode to **Full (Strict)**.

---

## Step 8: Post-Deployment Verification Checklist

- [ ] **Homepage loads:** Open `https://logistika.uz/uz` in your browser.
- [ ] **Security Headers:** Verify via [securityheaders.com](https://securityheaders.com) that CSP, HSTS, and X-Content-Type-Options are active with an A/A+ rating.
- [ ] **Form submission:** Submit a test entry with a valid `+998` number. Confirm it appears in your Supabase `waitlist` table.
- [ ] **Duplicate phone protection:** Submit the exact same number a second time; verify that a friendly "Already registered" notice is returned.
- [ ] **Rate limit check:** Rapidly submit 6 requests in under a minute to verify the rate limit blocks excessive traffic.
- [ ] **Theme and Languages:** Switch between UZ, RU, EN and toggle dark/light theme to ensure instant responsiveness without layout shift.
