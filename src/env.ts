import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Supabase server credentials (service role is strictly server-only)
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    // Upstash Redis credentials for distributed rate limiting
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Cloudflare Turnstile secret key (defaults to official test key in dev)
    TURNSTILE_SECRET_KEY: z
      .string()
      .default("1x0000000000000000000000000000000AA"),
    // Salt for hashing IP addresses and security tokens
    IP_HASH_SALT: z.string().optional(),
    // Local dev-only session signing secret (ignored when Supabase is configured)
    AUTH_DEV_SECRET: z.string().optional(),
  },
  client: {
    // Cloudflare Turnstile client site key (defaults to official test site key in dev)
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
      .string()
      .default("1x00000000000000000000AA"),
    // Supabase public URL and anon key (optional in dev fallback)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    // Site URL for canonical URLs and Open Graph
    NEXT_PUBLIC_SITE_URL: z.string().url().default("https://transflow.uz"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
