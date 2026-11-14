-- ==============================================================================
-- TRANSFLOW PLATFORM - RLS POLICIES, ANTI-ESCALATION GUARDS & PRIVATE STORAGE
-- ==============================================================================
-- Run AFTER 20261112_01_platform_schema.sql.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SERVER-CONTROLLED AUTH HOOK (create profile safely from app_metadata only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  server_role TEXT;
  server_lang TEXT;
BEGIN
  -- Trust ONLY app_metadata set by server-side admin/service_role logic
  server_role := COALESCE(NEW.raw_app_meta_data ->> 'role', 'driver');
  IF server_role NOT IN ('company_owner', 'dispatcher', 'driver') THEN
    server_role := 'driver';
  END IF;

  server_lang := COALESCE(NEW.raw_app_meta_data ->> 'preferred_language', 'uz');
  IF server_lang NOT IN ('uz', 'ru', 'en') THEN
    server_lang := 'uz';
  END IF;

  INSERT INTO public.profiles (id, role, preferred_language)
  VALUES (NEW.id, server_role, server_lang)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. SECURITY DEFINER HELPERS FOR RLS (avoid recursive policy evaluation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND role IN ('company_owner', 'dispatcher')
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. IMMUTABILITY & TRANSITION GUARD TRIGGERS (defense in depth)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_immutable_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Never allow regular client/authenticated sessions to alter role or bypass onboarding
  IF CURRENT_USER NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: role cannot be modified by client session';
    END IF;
    IF NEW.onboarding_completed = TRUE AND OLD.onboarding_completed = FALSE THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.user_id = NEW.id AND cm.is_active = TRUE
      ) THEN
        RAISE EXCEPTION 'Unauthorized: onboarding cannot complete without active company membership';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_immutable ON public.profiles;
CREATE TRIGGER profiles_guard_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_immutable_columns();

CREATE OR REPLACE FUNCTION public.guard_driver_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  v_role := public.current_user_role();
  IF v_role = 'driver' THEN
    -- Drivers cannot reassign, re-company, or alter order payload fields
    IF NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.order_number IS DISTINCT FROM OLD.order_number
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id
       OR NEW.assigned_vehicle_id IS DISTINCT FROM OLD.assigned_vehicle_id
       OR NEW.pickup_address IS DISTINCT FROM OLD.pickup_address
       OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
       OR NEW.cargo_description IS DISTINCT FROM OLD.cargo_description
       OR NEW.weight_kg IS DISTINCT FROM OLD.weight_kg
       OR NEW.price_uzs IS DISTINCT FROM OLD.price_uzs
       OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at
       OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
       OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone THEN
      RAISE EXCEPTION 'Unauthorized: driver can only update status and delivered_at';
    END IF;

    -- Allowed driver transitions only: assigned -> in_transit, in_transit -> delivered
    IF NOT (
      (OLD.status = 'assigned' AND NEW.status = 'in_transit')
      OR (OLD.status = 'in_transit' AND NEW.status = 'delivered')
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition for driver: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_driver_update ON public.orders;
CREATE TRIGGER orders_guard_driver_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_driver_order_update();

-- ------------------------------------------------------------------------------
-- 4. ENABLE RLS & REVOKE PUBLIC SCHEMA PRIVILEGES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles, public.companies, public.company_members, public.invites,
  public.vehicles, public.driver_profiles, public.orders, public.order_status_history,
  public.delivery_proofs, public.audit_logs, public.data_requests FROM public, anon;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.driver_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT SELECT, INSERT ON public.delivery_proofs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.data_requests TO authenticated;

GRANT ALL ON public.profiles, public.companies, public.company_members, public.invites,
  public.vehicles, public.driver_profiles, public.orders, public.order_status_history,
  public.delivery_proofs, public.audit_logs, public.data_requests TO service_role;

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES
-- ------------------------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_own_or_company_managers" ON public.profiles;
CREATE POLICY "profiles_select_own_or_company_managers"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (
    public.is_company_manager()
    AND EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.user_id = profiles.id
        AND cm.company_id = public.current_user_company_id()
    )
  )
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- COMPANIES
DROP POLICY IF EXISTS "companies_select_member" ON public.companies;
CREATE POLICY "companies_select_member"
ON public.companies FOR SELECT TO authenticated
USING (id = public.current_user_company_id() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "companies_insert_owner" ON public.companies;
CREATE POLICY "companies_insert_owner"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.current_user_role() = 'company_owner'
);

DROP POLICY IF EXISTS "companies_update_owner" ON public.companies;
CREATE POLICY "companies_update_owner"
ON public.companies FOR UPDATE TO authenticated
USING (owner_id = auth.uid() AND public.current_user_role() = 'company_owner')
WITH CHECK (owner_id = auth.uid() AND public.current_user_role() = 'company_owner');

-- COMPANY_MEMBERS
DROP POLICY IF EXISTS "company_members_select_scope" ON public.company_members;
CREATE POLICY "company_members_select_scope"
ON public.company_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (public.is_company_manager() AND company_id = public.current_user_company_id())
);

DROP POLICY IF EXISTS "company_members_owner_insert_self" ON public.company_members;
CREATE POLICY "company_members_owner_insert_self"
ON public.company_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'company_owner'
  AND public.current_user_role() = 'company_owner'
  AND EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "company_members_owner_manage" ON public.company_members;
CREATE POLICY "company_members_owner_manage"
ON public.company_members FOR UPDATE TO authenticated
USING (
  company_id = public.current_user_company_id()
  AND (
    (public.current_user_role() = 'company_owner' AND role IN ('dispatcher', 'driver'))
    OR (public.current_user_role() = 'dispatcher' AND role = 'driver')
  )
)
WITH CHECK (
  company_id = public.current_user_company_id()
  AND (
    (public.current_user_role() = 'company_owner' AND role IN ('dispatcher', 'driver'))
    OR (public.current_user_role() = 'dispatcher' AND role = 'driver')
  )
);

-- INVITES
DROP POLICY IF EXISTS "invites_select_company_managers" ON public.invites;
CREATE POLICY "invites_select_company_managers"
ON public.invites FOR SELECT TO authenticated
USING (public.is_company_manager() AND company_id = public.current_user_company_id());

DROP POLICY IF EXISTS "invites_insert_managers" ON public.invites;
CREATE POLICY "invites_insert_managers"
ON public.invites FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_user_company_id()
  AND created_by = auth.uid()
  AND (
    public.current_user_role() = 'company_owner'
    OR (public.current_user_role() = 'dispatcher' AND role = 'driver')
  )
);

DROP POLICY IF EXISTS "invites_delete_managers" ON public.invites;
CREATE POLICY "invites_delete_managers"
ON public.invites FOR DELETE TO authenticated
USING (
  company_id = public.current_user_company_id()
  AND (
    public.current_user_role() = 'company_owner'
    OR (public.current_user_role() = 'dispatcher' AND role = 'driver')
  )
);

-- VEHICLES
DROP POLICY IF EXISTS "vehicles_select_company" ON public.vehicles;
CREATE POLICY "vehicles_select_company"
ON public.vehicles FOR SELECT TO authenticated
USING (company_id = public.current_user_company_id());

DROP POLICY IF EXISTS "vehicles_manage_managers" ON public.vehicles;
CREATE POLICY "vehicles_manage_managers"
ON public.vehicles FOR ALL TO authenticated
USING (public.is_company_manager() AND company_id = public.current_user_company_id())
WITH CHECK (public.is_company_manager() AND company_id = public.current_user_company_id());

-- DRIVER_PROFILES
DROP POLICY IF EXISTS "driver_profiles_select_scope" ON public.driver_profiles;
CREATE POLICY "driver_profiles_select_scope"
ON public.driver_profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (public.is_company_manager() AND company_id = public.current_user_company_id())
);

DROP POLICY IF EXISTS "driver_profiles_insert_own" ON public.driver_profiles;
CREATE POLICY "driver_profiles_insert_own"
ON public.driver_profiles FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.current_user_company_id()
  AND public.current_user_role() = 'driver'
);

DROP POLICY IF EXISTS "driver_profiles_update_scope" ON public.driver_profiles;
CREATE POLICY "driver_profiles_update_scope"
ON public.driver_profiles FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (public.is_company_manager() AND company_id = public.current_user_company_id())
)
WITH CHECK (
  company_id = public.current_user_company_id()
  AND (user_id = auth.uid() OR public.is_company_manager())
);

-- ORDERS
DROP POLICY IF EXISTS "orders_select_scope" ON public.orders;
CREATE POLICY "orders_select_scope"
ON public.orders FOR SELECT TO authenticated
USING (
  company_id = public.current_user_company_id()
  AND (
    public.is_company_manager()
    OR assigned_driver_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "orders_insert_managers" ON public.orders;
CREATE POLICY "orders_insert_managers"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  public.is_company_manager()
  AND company_id = public.current_user_company_id()
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "orders_update_scope" ON public.orders;
CREATE POLICY "orders_update_scope"
ON public.orders FOR UPDATE TO authenticated
USING (
  company_id = public.current_user_company_id()
  AND (
    public.is_company_manager()
    OR assigned_driver_id = auth.uid()
  )
)
WITH CHECK (
  company_id = public.current_user_company_id()
  AND (
    public.is_company_manager()
    OR assigned_driver_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "orders_delete_managers" ON public.orders;
CREATE POLICY "orders_delete_managers"
ON public.orders FOR DELETE TO authenticated
USING (public.is_company_manager() AND company_id = public.current_user_company_id());

-- ORDER_STATUS_HISTORY
DROP POLICY IF EXISTS "order_history_select_scope" ON public.order_status_history;
CREATE POLICY "order_history_select_scope"
ON public.order_status_history FOR SELECT TO authenticated
USING (
  company_id = public.current_user_company_id()
  AND (
    public.is_company_manager()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.assigned_driver_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "order_history_insert_scope" ON public.order_status_history;
CREATE POLICY "order_history_insert_scope"
ON public.order_status_history FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_user_company_id()
  AND changed_by = auth.uid()
  AND (
    public.is_company_manager()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.assigned_driver_id = auth.uid()
    )
  )
);

-- DELIVERY_PROOFS
DROP POLICY IF EXISTS "delivery_proofs_select_scope" ON public.delivery_proofs;
CREATE POLICY "delivery_proofs_select_scope"
ON public.delivery_proofs FOR SELECT TO authenticated
USING (
  company_id = public.current_user_company_id()
  AND (public.is_company_manager() OR driver_id = auth.uid())
);

DROP POLICY IF EXISTS "delivery_proofs_insert_driver" ON public.delivery_proofs;
CREATE POLICY "delivery_proofs_insert_driver"
ON public.delivery_proofs FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_user_company_id()
  AND driver_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = delivery_proofs.order_id
      AND o.company_id = public.current_user_company_id()
      AND o.assigned_driver_id = auth.uid()
  )
);

-- AUDIT_LOGS (select own company audit logs for owner, or own actor events; insert server-only)
DROP POLICY IF EXISTS "audit_logs_select_scope" ON public.audit_logs;
CREATE POLICY "audit_logs_select_scope"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  actor_id = auth.uid()
  OR (
    public.current_user_role() = 'company_owner'
    AND company_id = public.current_user_company_id()
  )
);

-- DATA_REQUESTS
DROP POLICY IF EXISTS "data_requests_select_own" ON public.data_requests;
CREATE POLICY "data_requests_select_own"
ON public.data_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "data_requests_insert_own" ON public.data_requests;
CREATE POLICY "data_requests_insert_own"
ON public.data_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 6. PRIVATE STORAGE BUCKET FOR DELIVERY PROOFS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-proofs',
  'delivery-proofs',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "delivery_proofs_storage_select" ON storage.objects;
CREATE POLICY "delivery_proofs_storage_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::TEXT
  AND (
    public.is_company_manager()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::TEXT = (storage.foldername(name))[2]
        AND o.assigned_driver_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "delivery_proofs_storage_insert" ON storage.objects;
CREATE POLICY "delivery_proofs_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::TEXT
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::TEXT = (storage.foldername(name))[2]
      AND o.company_id = public.current_user_company_id()
      AND o.assigned_driver_id = auth.uid()
  )
);
