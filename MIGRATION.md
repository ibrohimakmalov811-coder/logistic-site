# TransFlow: Plan A to Plan B (Supabase PostgreSQL) Migration Guide

This document outlines the transition path from **Plan A (In-Browser Storage with Repository Layer)** to **Plan B (Cloud Backend with Supabase PostgreSQL, RLS, and Storage)**.

---

## 1. Architectural Overview

| Aspect | Plan A (Current Demo) | Plan B (Target Production) |
| :--- | :--- | :--- |
| **Data Storage** | `localStorage` (`transflow_data_v1`) | Supabase PostgreSQL 15+ |
| **Binary Files / Proofs**| `IndexedDB` (`transflow_blobs_db`) | Supabase Storage (`delivery_proofs` bucket) |
| **Realtime Sync** | `BroadcastChannel` + `storage` event | Supabase Realtime (WebSocket CDC) |
| **Auth & Passwords** | Web Crypto PBKDF2 with salt | Supabase Auth (GoTrue JWT + MFA) |
| **Authorization** | Repository-level permission checks | Postgres Row-Level Security (RLS) |
| **UI Integration** | Calls `src/lib/data/` repositories | Same `src/lib/data/` repository interfaces! |

Because the entire application interacts exclusively with the repository contracts in `src/lib/data/repositories/contracts.ts`, **zero UI components need to be modified** when migrating to Supabase. Only the repository implementation classes are swapped.

---

## 2. Production PostgreSQL Schema (DDL)

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (linked with auth.users)
create type user_role as enum ('company_owner', 'dispatcher', 'driver');

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role user_role not null default 'driver',
  full_name text not null,
  phone text not null unique,
  citizenship text not null default 'O''zbekiston',
  residence_country text not null default 'O''zbekiston',
  language text not null default 'uz',
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Companies
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete restrict not null,
  name text not null,
  city text not null,
  fleet_size text,
  cargo_types text[],
  created_at timestamptz not null default now()
);

-- 3. Company Memberships
create table public.company_memberships (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  role user_role not null,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (user_id, company_id)
);

-- 4. Invites
create type invite_role as enum ('dispatcher', 'driver');

create table public.company_invites (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  role invite_role not null,
  code_hash text not null unique,
  code_preview text not null,
  created_by uuid references public.profiles(id) on delete set null,
  used_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  revoked_at timestamptz
);

-- 5. Vehicles
create type vehicle_type as enum ('tent', 'isotherm', 'refrigerator', 'container', 'flatbed', 'dump');
create type vehicle_status as enum ('active', 'maintenance', 'inactive');

create table public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  plate_number text not null,
  type vehicle_type not null default 'tent',
  capacity_kg integer not null,
  status vehicle_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (company_id, plate_number)
);

-- 6. Driver Profiles
create table public.driver_profiles (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  license_category text not null default 'CE',
  experience_years integer not null default 0,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Orders
create type order_status as enum ('new', 'assigned', 'in_transit', 'delivered', 'cancelled');

create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  pickup_address text not null,
  delivery_address text not null,
  cargo_description text not null,
  weight_kg integer not null,
  deadline timestamptz not null,
  customer_name text not null,
  customer_phone text not null,
  notes text,
  status order_status not null default 'new',
  driver_id uuid references public.profiles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Order Status History
create table public.order_status_history (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  status order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  note text
);

-- 9. Delivery Proofs
create table public.delivery_proofs (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null unique,
  storage_path text not null,
  mime_type text not null,
  file_size integer not null,
  note text,
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 10. In-App Notifications
create table public.in_app_notifications (
  id uuid default uuid_generate_v4() primary key,
  recipient_user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  target_type text not null,
  target_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
```

---

## 3. Row Level Security (RLS) Policies

```sql
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_invites enable row level security;
alter table public.vehicles enable row level security;
alter table public.orders enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.in_app_notifications enable row level security;

-- Profiles: Anyone can read their own profile, company members can read colleague profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Companies: Members can view their company
create policy "Company members can view their company"
  on public.companies for select
  using (
    id in (
      select company_id from public.company_memberships
      where user_id = auth.uid() and is_active = true
    )
  );

-- Orders:
-- Dispatcher / Owner can read and write all company orders
create policy "Company staff can view orders"
  on public.orders for select
  using (
    company_id in (
      select company_id from public.company_memberships
      where user_id = auth.uid() and is_active = true
    )
  );

-- Drivers can only update orders assigned to them
create policy "Drivers can update assigned orders"
  on public.orders for update
  using (
    driver_id = auth.uid()
  );

-- Notifications: Users only see their own notifications
create policy "Users see own notifications"
  on public.in_app_notifications for select
  using (recipient_user_id = auth.uid());

create policy "Users update own notifications"
  on public.in_app_notifications for update
  using (recipient_user_id = auth.uid());
```

---

## 4. Supabase Storage Migration

In Plan A, delivery proof photos are stored as binary blobs in `IndexedDB` (`transflow_blobs_db`).
In Plan B:
1. Create a private bucket in Supabase Storage named `delivery_proofs`.
2. Configure bucket RLS:
   - Drivers can upload photos (`INSERT`) for orders where `order.driver_id = auth.uid()`.
   - Company staff can download photos (`SELECT`) via signed URLs.
3. The `imageBlobRef` in `DeliveryProofEntity` simply changes from an IndexedDB key (e.g. `proof_order123_179441...`) to the storage bucket path (e.g. `proofs/{companyId}/{orderId}.jpg`).

---

## 5. Swapping Repository Implementations

In `src/lib/data/index.ts`:

```typescript
// PLAN A (Current):
export const orderRepo = new LocalOrderRepository();

// PLAN B (Supabase):
export const orderRepo = new SupabaseOrderRepository(supabaseClient);
```

Because `SupabaseOrderRepository` implements `IOrderRepository` from `src/lib/data/repositories/contracts.ts`, no UI components need changes.
