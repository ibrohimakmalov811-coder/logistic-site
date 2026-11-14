-- ==============================================================================
-- TRANSFLOW PLATFORM - PHASE 1 MULTI-TENANT SCHEMA
-- ==============================================================================
-- Run AFTER 20261111_create_waitlist_table.sql in Supabase SQL Editor.
-- Defines: profiles, companies, company_members, invites, vehicles,
-- driver_profiles, orders, order_status_history, delivery_proofs, audit_logs,
-- and data_requests with strict constraints, foreign keys, indexes & triggers.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (1:1 with auth.users; role is server-controlled)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('company_owner', 'dispatcher', 'driver')),
  preferred_language TEXT NOT NULL DEFAULT 'uz' CHECK (preferred_language IN ('uz', 'ru', 'en')),
  full_name TEXT CHECK (full_name IS NULL OR char_length(full_name) BETWEEN 2 AND 100),
  phone TEXT CHECK (phone IS NULL OR phone ~ '^\+998[0-9]{9}$'),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  deletion_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. COMPANIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  legal_form TEXT NOT NULL CHECK (legal_form IN ('llc', 'ie', 'jsc', 'other')),
  city_region TEXT NOT NULL CHECK (char_length(city_region) BETWEEN 2 AND 80),
  fleet_size TEXT NOT NULL CHECK (fleet_size IN ('1-4', '5-15', '16-30', '30+')),
  main_cargo_types TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS companies_owner_id_idx ON public.companies (owner_id);

DROP TRIGGER IF EXISTS companies_set_updated_at ON public.companies;
CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. COMPANY MEMBERS (single-company membership per user in Phase 1)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('company_owner', 'dispatcher', 'driver')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  CONSTRAINT company_members_user_unique UNIQUE (user_id),
  CONSTRAINT company_members_company_user_unique UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS company_members_company_id_idx ON public.company_members (company_id);

DROP TRIGGER IF EXISTS company_members_set_updated_at ON public.company_members;
CREATE TRIGGER company_members_set_updated_at
  BEFORE UPDATE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. INVITES (single-use, expiring, SHA-256 hashed codes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  code_hint TEXT NOT NULL CHECK (char_length(code_hint) BETWEEN 4 AND 32),
  role TEXT NOT NULL CHECK (role IN ('dispatcher', 'driver')),
  invited_email TEXT CHECK (invited_email IS NULL OR char_length(invited_email) BETWEEN 3 AND 254),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS invites_company_created_idx ON public.invites (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invites_expires_idx ON public.invites (expires_at);

-- ------------------------------------------------------------------------------
-- 5. VEHICLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('tent', 'refrigerator', 'flatbed', 'container', 'van', 'other')),
  plate_number TEXT NOT NULL CHECK (char_length(plate_number) BETWEEN 4 AND 20),
  capacity_kg INTEGER NOT NULL CHECK (capacity_kg BETWEEN 100 AND 100000),
  region TEXT NOT NULL CHECK (char_length(region) BETWEEN 2 AND 80),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'maintenance', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  CONSTRAINT vehicles_company_plate_unique UNIQUE (company_id, plate_number)
);

CREATE INDEX IF NOT EXISTS vehicles_company_status_idx ON public.vehicles (company_id, status);

DROP TRIGGER IF EXISTS vehicles_set_updated_at ON public.vehicles;
CREATE TRIGGER vehicles_set_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 6. DRIVER PROFILES (no passport or national ID numbers stored)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  license_category TEXT NOT NULL CHECK (license_category IN ('B', 'C', 'CE', 'D', 'BE')),
  years_experience INTEGER NOT NULL CHECK (years_experience BETWEEN 0 AND 60),
  primary_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS driver_profiles_company_idx ON public.driver_profiles (company_id, is_active);

DROP TRIGGER IF EXISTS driver_profiles_set_updated_at ON public.driver_profiles;
CREATE TRIGGER driver_profiles_set_updated_at
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 7. ORDERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL CHECK (char_length(order_number) BETWEEN 3 AND 32),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL CHECK (char_length(pickup_address) BETWEEN 3 AND 250),
  delivery_address TEXT NOT NULL CHECK (char_length(delivery_address) BETWEEN 3 AND 250),
  cargo_description TEXT NOT NULL CHECK (char_length(cargo_description) BETWEEN 2 AND 300),
  weight_kg INTEGER NOT NULL CHECK (weight_kg BETWEEN 1 AND 100000),
  price_uzs BIGINT CHECK (price_uzs IS NULL OR price_uzs >= 0),
  deadline_at TIMESTAMPTZ NOT NULL,
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 100),
  customer_phone TEXT NOT NULL CHECK (customer_phone ~ '^\+998[0-9]{9}$'),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_transit', 'delivered', 'cancelled')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  CONSTRAINT orders_company_order_number_unique UNIQUE (company_id, order_number)
);

CREATE INDEX IF NOT EXISTS orders_company_status_idx ON public.orders (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_driver_status_idx ON public.orders (assigned_driver_id, status, deadline_at ASC);

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. ORDER STATUS HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('new', 'assigned', 'in_transit', 'delivered', 'cancelled')),
  to_status TEXT NOT NULL CHECK (to_status IN ('new', 'assigned', 'in_transit', 'delivered', 'cancelled')),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON public.order_status_history (order_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 9. DELIVERY PROOFS (private bucket path references only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL CHECK (char_length(storage_path) BETWEEN 5 AND 500),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS delivery_proofs_company_idx ON public.delivery_proofs (company_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 10. AUDIT LOGS (no secrets, passwords, tokens, or excess PII)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (char_length(event_type) BETWEEN 2 AND 100),
  target_type TEXT CHECK (target_type IS NULL OR char_length(target_type) <= 64),
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS audit_logs_company_idx ON public.audit_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 11. DATA EXPORT / DELETION REQUESTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS data_requests_user_idx ON public.data_requests (user_id, created_at DESC);
