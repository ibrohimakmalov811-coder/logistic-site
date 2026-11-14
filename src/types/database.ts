export type UserRole = "company_owner" | "dispatcher" | "driver";
export type AppLocale = "uz" | "ru" | "en";
export type LegalForm = "llc" | "ie" | "jsc" | "other";
export type FleetSize = "1-4" | "5-15" | "16-30" | "30+";
export type VehicleType = "tent" | "refrigerator" | "flatbed" | "container" | "van" | "other";
export type VehicleStatus = "available" | "on_trip" | "maintenance" | "inactive";
export type LicenseCategory = "B" | "C" | "CE" | "D" | "BE";
export type OrderStatus = "new" | "assigned" | "in_transit" | "delivered" | "cancelled";
export type DataRequestType = "export" | "delete";
export type DataRequestStatus = "pending" | "processing" | "completed" | "cancelled";

export type ProfileRow = {
  id: string;
  role: UserRole;
  preferred_language: AppLocale;
  full_name: string | null;
  phone: string | null;
  onboarding_completed: boolean;
  onboarding_draft: Record<string, unknown> | null;
  deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyRow = {
  id: string;
  owner_id: string;
  name: string;
  legal_form: LegalForm;
  city_region: string;
  fleet_size: FleetSize;
  main_cargo_types: string[];
  created_at: string;
  updated_at: string;
}

export type CompanyMemberRow = {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InviteRow = {
  id: string;
  company_id: string;
  created_by: string;
  code_hash: string;
  code_hint: string;
  role: "dispatcher" | "driver";
  invited_email: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export type VehicleRow = {
  id: string;
  company_id: string;
  vehicle_type: VehicleType;
  plate_number: string;
  capacity_kg: number;
  region: string;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export type DriverProfileRow = {
  user_id: string;
  company_id: string;
  license_category: LicenseCategory;
  years_experience: number;
  primary_vehicle_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderRow = {
  id: string;
  order_number: string;
  company_id: string;
  created_by: string;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  pickup_address: string;
  delivery_address: string;
  cargo_description: string;
  weight_kg: number;
  price_uzs: number | null;
  deadline_at: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  status: OrderStatus;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatusHistoryRow = {
  id: string;
  order_id: string;
  company_id: string;
  changed_by: string | null;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
}

export type DeliveryProofRow = {
  id: string;
  order_id: string;
  company_id: string;
  driver_id: string;
  storage_path: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  file_size_bytes: number;
  note: string | null;
  created_at: string;
}

export type AuditLogRow = {
  id: string;
  company_id: string | null;
  actor_id: string | null;
  event_type: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_hash: string | null;
  created_at: string;
}

export type DataRequestRow = {
  id: string;
  user_id: string;
  request_type: DataRequestType;
  status: DataRequestStatus;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "role">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      companies: {
        Row: CompanyRow;
        Insert: Omit<CompanyRow, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<CompanyRow>;
        Relationships: [];
      };
      company_members: {
        Row: CompanyMemberRow;
        Insert: Omit<CompanyMemberRow, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<CompanyMemberRow>;
        Relationships: [];
      };
      invites: {
        Row: InviteRow;
        Insert: Omit<InviteRow, "id" | "used_at" | "used_by" | "created_at"> & {
          id?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: Partial<InviteRow>;
        Relationships: [];
      };
      vehicles: {
        Row: VehicleRow;
        Insert: Omit<VehicleRow, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<VehicleRow>;
        Relationships: [];
      };
      driver_profiles: {
        Row: DriverProfileRow;
        Insert: Omit<DriverProfileRow, "created_at" | "updated_at">;
        Update: Partial<DriverProfileRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      order_status_history: {
        Row: OrderStatusHistoryRow;
        Insert: Omit<OrderStatusHistoryRow, "id" | "note" | "created_at"> & {
          id?: string;
          note?: string | null;
        };
        Update: Partial<OrderStatusHistoryRow>;
        Relationships: [];
      };
      delivery_proofs: {
        Row: DeliveryProofRow;
        Insert: Omit<DeliveryProofRow, "id" | "created_at"> & { id?: string };
        Update: Partial<DeliveryProofRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at"> & { id?: string };
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      data_requests: {
        Row: DataRequestRow;
        Insert: Omit<DataRequestRow, "id" | "status" | "created_at"> & {
          id?: string;
          status?: DataRequestStatus;
        };
        Update: Partial<DataRequestRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
