-- ==============================================================================
-- TRANSFLOW PLATFORM - RLS & MULTI-TENANT SECURITY VERIFICATION SCRIPT
-- ==============================================================================
-- Run in Supabase SQL Editor or psql against your database.
-- Wraps all assertions in a transaction and ROLLs BACK cleanly at the end
-- so zero test records remain in production/staging tables.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_owner_a UUID := gen_random_uuid();
  v_driver_a1 UUID := gen_random_uuid();
  v_driver_a2 UUID := gen_random_uuid();
  v_owner_b UUID := gen_random_uuid();
  v_company_a UUID := gen_random_uuid();
  v_company_b UUID := gen_random_uuid();
  v_vehicle_a UUID := gen_random_uuid();
  v_order_a1 UUID := gen_random_uuid();
  v_order_a2 UUID := gen_random_uuid();
  v_order_b1 UUID := gen_random_uuid();
  v_count INTEGER;
  v_failed BOOLEAN;
BEGIN
  -- 1. Seed isolated Company A (owner + 2 drivers + 2 orders) and Company B
  INSERT INTO auth.users (id, email, raw_app_meta_data, aud, role)
  VALUES
    (v_owner_a, 'rls-owner-a@example.test', '{"role":"company_owner"}'::jsonb, 'authenticated', 'authenticated'),
    (v_driver_a1, 'rls-driver-a1@example.test', '{"role":"driver"}'::jsonb, 'authenticated', 'authenticated'),
    (v_driver_a2, 'rls-driver-a2@example.test', '{"role":"driver"}'::jsonb, 'authenticated', 'authenticated'),
    (v_owner_b, 'rls-owner-b@example.test', '{"role":"company_owner"}'::jsonb, 'authenticated', 'authenticated');

  INSERT INTO public.companies (id, owner_id, name, legal_form, city_region, fleet_size)
  VALUES
    (v_company_a, v_owner_a, 'RLS Test Fleet A', 'llc', 'Toshkent', '5-15'),
    (v_company_b, v_owner_b, 'RLS Test Fleet B', 'llc', 'Samarqand', '5-15');

  INSERT INTO public.company_members (company_id, user_id, role, is_active)
  VALUES
    (v_company_a, v_owner_a, 'company_owner', TRUE),
    (v_company_a, v_driver_a1, 'driver', TRUE),
    (v_company_a, v_driver_a2, 'driver', TRUE),
    (v_company_b, v_owner_b, 'company_owner', TRUE);

  INSERT INTO public.vehicles (id, company_id, vehicle_type, plate_number, capacity_kg, region, status)
  VALUES (v_vehicle_a, v_company_a, 'tent', '01A111AA', 20000, 'Toshkent', 'available');

  INSERT INTO public.orders (
    id, order_number, company_id, created_by, assigned_driver_id, assigned_vehicle_id,
    pickup_address, delivery_address, cargo_description, weight_kg, deadline_at,
    customer_name, customer_phone, status
  )
  VALUES
    (v_order_a1, 'RLS-A-01', v_company_a, v_owner_a, v_driver_a1, v_vehicle_a, 'Toshkent', 'Samarqand', 'Cargo A1', 5000, NOW() + INTERVAL '1 day', 'Client A1', '+998901112233', 'assigned'),
    (v_order_a2, 'RLS-A-02', v_company_a, v_owner_a, v_driver_a2, v_vehicle_a, 'Toshkent', 'Buxoro', 'Cargo A2', 7000, NOW() + INTERVAL '1 day', 'Client A2', '+998901112244', 'assigned'),
    (v_order_b1, 'RLS-B-01', v_company_b, v_owner_b, NULL, NULL, 'Namangan', 'Fargona', 'Cargo B1', 4000, NOW() + INTERVAL '1 day', 'Client B1', '+998901112255', 'new');

  -- 2. TEST AS ANON: must not read orders, profiles, or waitlist
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT count(*) INTO v_count FROM public.waitlist;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: anon should see 0 rows in waitlist (RLS denial), got %', v_count;
  END IF;

  v_failed := FALSE;
  BEGIN
    PERFORM * FROM public.orders;
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := TRUE;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL: anon must have insufficient_privilege on public.orders';
  END IF;

  -- 3. TEST AS OWNER A: sees Company A orders, CANNOT see or modify Company B
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_owner_a::TEXT, TRUE);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', TRUE);

  SELECT count(*) INTO v_count FROM public.orders WHERE company_id = v_company_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Owner A saw % Company B orders!', v_count;
  END IF;

  UPDATE public.orders SET notes = 'tampered' WHERE id = v_order_b1;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Owner A updated % Company B orders!', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.companies WHERE id = v_company_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Owner A read Company B row!';
  END IF;

  -- 4. TEST AS DRIVER A1: sees ONLY Order A1, NOT Order A2 or Order B1
  PERFORM set_config('request.jwt.claim.sub', v_driver_a1::TEXT, TRUE);

  SELECT count(*) INTO v_count FROM public.orders;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Driver A1 must see exactly 1 assigned order, saw %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.orders WHERE id = v_order_a2;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Driver A1 saw Driver A2 order!';
  END IF;

  -- 5. TEST PRIVILEGE ESCALATION: Driver A1 CANNOT change own role
  v_failed := FALSE;
  BEGIN
    UPDATE public.profiles SET role = 'company_owner' WHERE id = v_driver_a1;
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL: Driver A1 was able to change profiles.role!';
  END IF;

  -- 6. TEST ORDER TAMPERING: Driver A1 CANNOT jump assigned -> delivered or alter payload
  v_failed := FALSE;
  BEGIN
    UPDATE public.orders SET status = 'delivered' WHERE id = v_order_a1;
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL: Driver A1 skipped in_transit (assigned -> delivered)!';
  END IF;

  v_failed := FALSE;
  BEGIN
    UPDATE public.orders SET pickup_address = 'Hacked' WHERE id = v_order_a1;
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL: Driver A1 modified pickup_address!';
  END IF;

  -- Valid driver transition: assigned -> in_transit MUST succeed
  UPDATE public.orders SET status = 'in_transit' WHERE id = v_order_a1;

  RESET ROLE;
  RAISE NOTICE 'ALL RLS AND PRIVILEGE-ESCALATION CHECKS PASSED';
END $$;

ROLLBACK;
