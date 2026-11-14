-- ==============================================================================
-- LOGISTIKA PLATFORM - WAITLIST TABLE & ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Run this migration in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- This script:
-- 1. Creates the waitlist table with strict column types and constraints.
-- 2. Enables Row Level Security (RLS).
-- 3. Grants INSERT-only permissions to the anonymous (anon) role.
-- 4. Strictly forbids SELECT, UPDATE, DELETE for public/anonymous clients.
-- 5. Grants full administrative access only to the service_role key on the server.
-- ==============================================================================

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
    phone TEXT NOT NULL CHECK (phone ~ '^\+998[0-9]{9}$'),
    company_name TEXT NOT NULL CHECK (char_length(company_name) BETWEEN 2 AND 120),
    role TEXT NOT NULL CHECK (role IN ('owner', 'dispatcher', 'driver', 'other')),
    fleet_size TEXT NOT NULL CHECK (fleet_size IN ('1-4', '5-15', '16-30', '30+')),
    preferred_language TEXT NOT NULL CHECK (preferred_language IN ('uz', 'ru', 'en')),
    consent BOOLEAN NOT NULL DEFAULT TRUE CHECK (consent = TRUE),
    ip_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Unique index to prevent duplicate phone signups
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_phone_unique_idx ON public.waitlist (phone);

-- Index for chronological queries in admin dashboard
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON public.waitlist (created_at DESC);

-- Enable Row Level Security (CRITICAL SECURITY REQUIREMENT)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow anonymous insert only" ON public.waitlist;
DROP POLICY IF EXISTS "Disallow public select" ON public.waitlist;
DROP POLICY IF EXISTS "Disallow public update" ON public.waitlist;
DROP POLICY IF EXISTS "Disallow public delete" ON public.waitlist;
DROP POLICY IF EXISTS "Allow service role full access" ON public.waitlist;

-- 1. Anonymous role (client-side anon key) CAN ONLY INSERT
CREATE POLICY "Allow anonymous insert only"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (
    consent = TRUE
    AND char_length(full_name) >= 2
    AND phone ~ '^\+998[0-9]{9}$'
);

-- 2. Anonymous role CANNOT read any submissions (protects applicant privacy)
CREATE POLICY "Disallow public select"
ON public.waitlist
FOR SELECT
TO anon
USING (FALSE);

-- 3. Anonymous role CANNOT update or tamper with records
CREATE POLICY "Disallow public update"
ON public.waitlist
FOR UPDATE
TO anon
USING (FALSE);

-- 4. Anonymous role CANNOT delete records
CREATE POLICY "Disallow public delete"
ON public.waitlist
FOR DELETE
TO anon
USING (FALSE);

-- 5. Service role (used exclusively server-side) has full administrative access
CREATE POLICY "Allow service role full access"
ON public.waitlist
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Revoke default public schema permissions for extra defense in depth
REVOKE ALL ON public.waitlist FROM public;
GRANT INSERT ON public.waitlist TO anon;
GRANT ALL ON public.waitlist TO service_role;

COMMENT ON TABLE public.waitlist IS 'Early-access waitlist submissions with strict RLS and field validation';
