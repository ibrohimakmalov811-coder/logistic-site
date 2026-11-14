import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isDevSandboxActive,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/config";
import { getDevDb } from "@/lib/dev-store";
import type { ServerAuthContext } from "@/lib/auth/session";
import type {
  CompanyMemberRow,
  CompanyRow,
  DataRequestRow,
  DeliveryProofRow,
  DriverProfileRow,
  InviteRow,
  OrderRow,
  OrderStatus,
  OrderStatusHistoryRow,
  ProfileRow,
  VehicleRow,
} from "@/types/database";

export type EnrichedOrder = OrderRow & {
  driverName: string | null;
  driverPhone: string | null;
  vehicleLabel: string | null;
};

export interface CompanyOverviewData {
  company: CompanyRow;
  activeOrdersCount: number;
  deliveredTodayCount: number;
  availableDriversCount: number;
  activeVehiclesCount: number;
  delayedCount: number;
  recentOrders: EnrichedOrder[];
}

export interface OrdersFilterParams {
  q?: string;
  status?: OrderStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface PaginatedOrdersResult {
  orders: EnrichedOrder[];
  totalCount: number;
  page: number;
  pageSize: number;
  drivers: Array<{ id: string; fullName: string; phone: string | null }>;
  vehicles: Array<{ id: string; label: string; plateNumber: string }>;
}

export interface OrderDetailBundle {
  order: EnrichedOrder;
  history: Array<OrderStatusHistoryRow & { actorName: string | null }>;
  proofs: Array<DeliveryProofRow & { signedUrl: string | null }>;
  drivers: Array<{ id: string; fullName: string; phone: string | null }>;
  vehicles: Array<{ id: string; label: string; plateNumber: string }>;
}

export interface CompanyDriverListItem {
  userId: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  joinedAt: string;
  licenseCategory: string | null;
  yearsExperience: number | null;
  primaryVehicleId: string | null;
  assignedVehicleLabel: string | null;
}

export interface CompanyReportsData {
  totalOrders: number;
  deliveredCount: number;
  delayedCount: number;
  cancelledCount: number;
  activeCount: number;
  totalRevenueUzs: number;
  statusBreakdown: Array<{ status: OrderStatus; count: number }>;
  dailySeries: Array<{ dayLabel: string; delivered: number; delayed: number }>;
}

export function formatVehicleLabel(vehicle: VehicleRow): string {
  return `${vehicle.plate_number} · ${vehicle.vehicle_type} (${vehicle.region})`;
}

function getTodayIsoStart(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function enrichOrderList(
  orders: OrderRow[],
  profilesMap: Map<string, ProfileRow>,
  vehiclesMap: Map<string, VehicleRow>
): EnrichedOrder[] {
  return orders.map((order) => {
    const driver = order.assigned_driver_id
      ? profilesMap.get(order.assigned_driver_id)
      : null;
    const vehicle = order.assigned_vehicle_id
      ? vehiclesMap.get(order.assigned_vehicle_id)
      : null;
    return {
      ...order,
      driverName: driver?.full_name || null,
      driverPhone: driver?.phone || null,
      vehicleLabel: vehicle ? formatVehicleLabel(vehicle) : null,
    };
  });
}

async function generateProofSignedUrl(
  storagePath: string
): Promise<string | null> {
  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) return null;
    const { data } = await admin.storage
      .from("delivery-proofs")
      .createSignedUrl(storagePath, 300);
    return data?.signedUrl ?? null;
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const file = db.devProofFiles[storagePath];
    if (!file) return null;
    return `data:${file.mimeType};base64,${file.base64}`;
  }

  return null;
}

async function loadCompanyContextRows(companyId: string): Promise<{
  profiles: ProfileRow[];
  members: CompanyMemberRow[];
  driverProfiles: DriverProfileRow[];
  vehicles: VehicleRow[];
  orders: OrderRow[];
  invites: InviteRow[];
}> {
  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (!client) {
      return {
        profiles: [],
        members: [],
        driverProfiles: [],
        vehicles: [],
        orders: [],
        invites: [],
      };
    }

    const [
      { data: members },
      { data: driverProfiles },
      { data: vehicles },
      { data: orders },
      { data: invites },
    ] = await Promise.all([
      client
        .from("company_members")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      client.from("driver_profiles").select("*").eq("company_id", companyId),
      client
        .from("vehicles")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      client
        .from("orders")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      client
        .from("invites")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
    ]);

    const userIds = Array.from(
      new Set((members ?? []).map((m) => m.user_id))
    );
    const { data: profiles } =
      userIds.length > 0
        ? await client.from("profiles").select("*").in("id", userIds)
        : { data: [] as ProfileRow[] };

    return {
      profiles: profiles ?? [],
      members: members ?? [],
      driverProfiles: driverProfiles ?? [],
      vehicles: vehicles ?? [],
      orders: orders ?? [],
      invites: invites ?? [],
    };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const members = db.companyMembers
      .filter((m) => m.company_id === companyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const memberIds = new Set(members.map((m) => m.user_id));

    return {
      profiles: db.profiles.filter((p) => memberIds.has(p.id)),
      members,
      driverProfiles: db.driverProfiles.filter(
        (dp) => dp.company_id === companyId
      ),
      vehicles: db.vehicles
        .filter((v) => v.company_id === companyId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      orders: db.orders
        .filter((o) => o.company_id === companyId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      invites: db.invites
        .filter((i) => i.company_id === companyId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }

  return {
    profiles: [],
    members: [],
    driverProfiles: [],
    vehicles: [],
    orders: [],
    invites: [],
  };
}

export async function getCompanyOverviewData(
  ctx: ServerAuthContext
): Promise<CompanyOverviewData | null> {
  if (!ctx.membership || !ctx.company) return null;

  const { profiles, members, driverProfiles, vehicles, orders } =
    await loadCompanyContextRows(ctx.membership.company_id);

  const profilesMap = new Map(profiles.map((p) => [p.id, p]));
  const vehiclesMap = new Map(vehicles.map((v) => [v.id, v]));
  const todayStart = getTodayIsoStart();

  const activeStatuses = new Set<OrderStatus>(["new", "assigned", "in_transit"]);

  const activeOrdersCount = orders.filter((o) =>
    activeStatuses.has(o.status)
  ).length;

  const deliveredTodayCount = orders.filter((o) => {
    if (o.status !== "delivered" || !o.delivered_at) return false;
    return new Date(o.delivered_at).getTime() >= todayStart;
  }).length;

  const delayedCount = orders.filter((o) => {
    if (!o.deadline_at) return false;
    const due = new Date(o.deadline_at).getTime();
    if (o.status === "delivered" && o.delivered_at) {
      return new Date(o.delivered_at).getTime() > due;
    }
    return activeStatuses.has(o.status) && Date.now() > due;
  }).length;

  const activeDriverMemberIds = new Set(
    members
      .filter((m) => m.role === "driver" && m.is_active)
      .map((m) => m.user_id)
  );
  const availableDriversCount =
    driverProfiles.filter(
      (dp) => activeDriverMemberIds.has(dp.user_id) && dp.is_active
    ).length || activeDriverMemberIds.size;

  const activeVehiclesCount = vehicles.filter(
    (v) => v.status === "available" || v.status === "on_trip"
  ).length;

  const recentOrders = enrichOrderList(
    orders.slice(0, 6),
    profilesMap,
    vehiclesMap
  );

  return {
    company: ctx.company,
    activeOrdersCount,
    deliveredTodayCount,
    availableDriversCount,
    activeVehiclesCount,
    delayedCount,
    recentOrders,
  };
}

export async function getCompanyOrdersData(
  ctx: ServerAuthContext,
  filters: OrdersFilterParams = {}
): Promise<PaginatedOrdersResult> {
  if (!ctx.membership) {
    return {
      orders: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      drivers: [],
      vehicles: [],
    };
  }

  const { profiles, members, vehicles, orders } =
    await loadCompanyContextRows(ctx.membership.company_id);

  const profilesMap = new Map(profiles.map((p) => [p.id, p]));
  const vehiclesMap = new Map(vehicles.map((v) => [v.id, v]));

  const q = filters.q?.trim().toLowerCase() ?? "";
  const statusFilter = filters.status ?? "all";
  const pageSize = Math.min(Math.max(filters.pageSize ?? 10, 5), 50);
  const page = Math.max(filters.page ?? 1, 1);

  const enriched = enrichOrderList(orders, profilesMap, vehiclesMap).filter(
    (order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = [
          order.order_number,
          order.pickup_address,
          order.delivery_address,
          order.cargo_description,
          order.customer_name,
          order.driverName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }
  );

  const totalCount = enriched.length;
  const start = (page - 1) * pageSize;
  const paged = enriched.slice(start, start + pageSize);

  const drivers = members
    .filter((m) => m.role === "driver" && m.is_active)
    .map((m) => {
      const p = profilesMap.get(m.user_id);
      return {
        id: m.user_id,
        fullName: p?.full_name || m.user_id.slice(0, 8),
        phone: p?.phone || null,
      };
    });

  const activeVehicles = vehicles
    .filter((v) => v.status === "available" || v.status === "on_trip")
    .map((v) => ({
      id: v.id,
      label: formatVehicleLabel(v),
      plateNumber: v.plate_number,
    }));

  return {
    orders: paged,
    totalCount,
    page,
    pageSize,
    drivers,
    vehicles: activeVehicles,
  };
}

export async function getCompanyOrderDetail(
  ctx: ServerAuthContext,
  orderId: string
): Promise<OrderDetailBundle | null> {
  if (!ctx.membership) return null;
  const companyId = ctx.membership.company_id;

  const { profiles, members, vehicles, orders } =
    await loadCompanyContextRows(companyId);

  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  const profilesMap = new Map(profiles.map((p) => [p.id, p]));
  const vehiclesMap = new Map(vehicles.map((v) => [v.id, v]));
  const [enrichedOrder] = enrichOrderList([order], profilesMap, vehiclesMap);

  let historyRows: OrderStatusHistoryRow[] = [];
  let proofRows: DeliveryProofRow[] = [];

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (client) {
      const [{ data: h }, { data: p }] = await Promise.all([
        client
          .from("order_status_history")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
        client
          .from("delivery_proofs")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
      ]);
      historyRows = h ?? [];
      proofRows = p ?? [];
    }
  } else if (isDevSandboxActive()) {
    const db = getDevDb();
    historyRows = db.orderStatusHistory
      .filter((h) => h.order_id === order.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    proofRows = db.deliveryProofs
      .filter((p) => p.order_id === order.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const proofsWithUrls = await Promise.all(
    proofRows.map(async (p) => ({
      ...p,
      signedUrl: await generateProofSignedUrl(p.storage_path),
    }))
  );

  const drivers = members
    .filter((m) => m.role === "driver" && m.is_active)
    .map((m) => {
      const p = profilesMap.get(m.user_id);
      return {
        id: m.user_id,
        fullName: p?.full_name || m.user_id.slice(0, 8),
        phone: p?.phone || null,
      };
    });

  const activeVehicles = vehicles
    .filter((v) => v.status === "available" || v.status === "on_trip")
    .map((v) => ({
      id: v.id,
      label: formatVehicleLabel(v),
      plateNumber: v.plate_number,
    }));

  return {
    order: enrichedOrder,
    history: historyRows.map((h) => ({
      ...h,
      actorName: h.changed_by
        ? profilesMap.get(h.changed_by)?.full_name ?? null
        : null,
    })),
    proofs: proofsWithUrls,
    drivers,
    vehicles: activeVehicles,
  };
}

export async function getCompanyDriversData(ctx: ServerAuthContext): Promise<{
  drivers: CompanyDriverListItem[];
  invites: InviteRow[];
}> {
  if (!ctx.membership) return { drivers: [], invites: [] };

  const { profiles, members, driverProfiles, vehicles, invites } =
    await loadCompanyContextRows(ctx.membership.company_id);

  const profilesMap = new Map(profiles.map((p) => [p.id, p]));
  const dpMap = new Map(driverProfiles.map((d) => [d.user_id, d]));
  const vehiclesMap = new Map(vehicles.map((v) => [v.id, v]));

  const drivers = members
    .filter((m) => m.role === "driver")
    .map((m) => {
      const profile = profilesMap.get(m.user_id);
      const dp = dpMap.get(m.user_id);
      const vehicle = dp?.primary_vehicle_id
        ? vehiclesMap.get(dp.primary_vehicle_id)
        : null;
      return {
        userId: m.user_id,
        fullName: profile?.full_name || m.user_id.slice(0, 8),
        phone: profile?.phone || null,
        isActive: m.is_active,
        joinedAt: m.created_at,
        licenseCategory: dp?.license_category ?? null,
        yearsExperience: dp?.years_experience ?? null,
        primaryVehicleId: dp?.primary_vehicle_id ?? null,
        assignedVehicleLabel: vehicle ? formatVehicleLabel(vehicle) : null,
      };
    });

  const nowMs = Date.now();
  return {
    drivers,
    invites: invites.filter(
      (i) => !i.used_at && new Date(i.expires_at).getTime() > nowMs
    ),
  };
}

export async function getCompanyVehiclesData(
  ctx: ServerAuthContext
): Promise<VehicleRow[]> {
  if (!ctx.membership) return [];
  const { vehicles } = await loadCompanyContextRows(ctx.membership.company_id);
  return vehicles;
}

export async function getCompanyReportsData(
  ctx: ServerAuthContext
): Promise<CompanyReportsData> {
  if (!ctx.membership) {
    return {
      totalOrders: 0,
      deliveredCount: 0,
      delayedCount: 0,
      cancelledCount: 0,
      activeCount: 0,
      totalRevenueUzs: 0,
      statusBreakdown: [],
      dailySeries: [],
    };
  }

  const { orders } = await loadCompanyContextRows(ctx.membership.company_id);

  const countsByStatus = new Map<OrderStatus, number>();
  let deliveredCount = 0;
  let delayedCount = 0;
  let cancelledCount = 0;
  let activeCount = 0;
  let totalRevenueUzs = 0;

  const activeSet = new Set<OrderStatus>(["new", "assigned", "in_transit"]);

  const now = new Date();
  const days: Array<{
    key: string;
    label: string;
    delivered: number;
    delayed: number;
  }> = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const label = `${String(d.getDate()).padStart(2, "0")}.${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;
    days.push({ key, label, delivered: 0, delayed: 0 });
  }
  const daysMap = new Map(days.map((d) => [d.key, d]));

  for (const order of orders) {
    countsByStatus.set(
      order.status,
      (countsByStatus.get(order.status) ?? 0) + 1
    );

    if (order.status === "delivered") {
      deliveredCount += 1;
      totalRevenueUzs += order.price_uzs ?? 0;
    } else if (order.status === "cancelled") {
      cancelledCount += 1;
    } else if (activeSet.has(order.status)) {
      activeCount += 1;
    }

    const isDelayed = (() => {
      if (!order.deadline_at) return false;
      const due = new Date(order.deadline_at).getTime();
      if (order.status === "delivered" && order.delivered_at) {
        return new Date(order.delivered_at).getTime() > due;
      }
      return activeSet.has(order.status) && Date.now() > due;
    })();

    if (isDelayed) delayedCount += 1;

    const bucketKey = (order.delivered_at ?? order.created_at).slice(0, 10);
    const bucket = daysMap.get(bucketKey);
    if (bucket) {
      if (order.status === "delivered") bucket.delivered += 1;
      if (isDelayed) bucket.delayed += 1;
    }
  }

  return {
    totalOrders: orders.length,
    deliveredCount,
    delayedCount,
    cancelledCount,
    activeCount,
    totalRevenueUzs,
    statusBreakdown: Array.from(countsByStatus.entries()).map(
      ([status, count]) => ({ status, count })
    ),
    dailySeries: days.map((d) => ({
      dayLabel: d.label,
      delivered: d.delivered,
      delayed: d.delayed,
    })),
  };
}

export async function getCompanySettingsData(ctx: ServerAuthContext): Promise<{
  company: CompanyRow | null;
  teamMembers: Array<{
    userId: string;
    fullName: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    joinedAt: string;
  }>;
  invites: InviteRow[];
  dataRequests: DataRequestRow[];
}> {
  if (!ctx.membership || !ctx.company) {
    return { company: null, teamMembers: [], invites: [], dataRequests: [] };
  }

  const { profiles, members, invites } = await loadCompanyContextRows(
    ctx.membership.company_id
  );
  const profilesMap = new Map(profiles.map((p) => [p.id, p]));

  let dataRequests: DataRequestRow[] = [];
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("data_requests")
        .select("*")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false });
      dataRequests = data ?? [];
    }
  } else if (isDevSandboxActive()) {
    const db = getDevDb();
    dataRequests = db.dataRequests
      .filter((r) => r.user_id === ctx.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const nowMs = Date.now();
  return {
    company: ctx.company,
    teamMembers: members.map((m) => {
      const p = profilesMap.get(m.user_id);
      return {
        userId: m.user_id,
        fullName: p?.full_name || m.user_id.slice(0, 8),
        phone: p?.phone || null,
        role: m.role,
        isActive: m.is_active,
        joinedAt: m.created_at,
      };
    }),
    invites: invites.filter(
      (i) => !i.used_at && new Date(i.expires_at).getTime() > nowMs
    ),
    dataRequests,
  };
}

// ---------------------------------------------------------------------------
// Driver Portal Queries (strictly scoped to assigned_driver_id === ctx.userId)
// ---------------------------------------------------------------------------
export async function getDriverOrdersData(ctx: ServerAuthContext): Promise<{
  current: EnrichedOrder[];
  upcoming: EnrichedOrder[];
  completed: EnrichedOrder[];
  companyName: string | null;
}> {
  if (!ctx.membership) {
    return { current: [], upcoming: [], completed: [], companyName: null };
  }

  let orders: OrderRow[] = [];
  let vehicles: VehicleRow[] = [];

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const client = admin ?? supabase;
    if (client) {
      const [{ data: o }, { data: v }] = await Promise.all([
        client
          .from("orders")
          .select("*")
          .eq("company_id", ctx.membership.company_id)
          .eq("assigned_driver_id", ctx.userId)
          .order("deadline_at", { ascending: true }),
        client
          .from("vehicles")
          .select("*")
          .eq("company_id", ctx.membership.company_id),
      ]);
      orders = o ?? [];
      vehicles = v ?? [];
    }
  } else if (isDevSandboxActive()) {
    const db = getDevDb();
    orders = db.orders
      .filter(
        (o) =>
          o.company_id === ctx.membership!.company_id &&
          o.assigned_driver_id === ctx.userId
      )
      .sort((a, b) => a.deadline_at.localeCompare(b.deadline_at));
    vehicles = db.vehicles.filter(
      (v) => v.company_id === ctx.membership!.company_id
    );
  }

  const vehiclesMap = new Map(vehicles.map((v) => [v.id, v]));
  const profilesMap = new Map([[ctx.userId, ctx.profile]]);
  const enriched = enrichOrderList(orders, profilesMap, vehiclesMap);

  return {
    current: enriched.filter((o) => o.status === "in_transit"),
    upcoming: enriched.filter(
      (o) => o.status === "assigned" || o.status === "new"
    ),
    completed: enriched.filter(
      (o) => o.status === "delivered" || o.status === "cancelled"
    ),
    companyName: ctx.company?.name ?? null,
  };
}

export async function getDriverOrderDetail(
  ctx: ServerAuthContext,
  orderId: string
): Promise<{
  order: EnrichedOrder;
  proofs: Array<DeliveryProofRow & { signedUrl: string | null }>;
} | null> {
  if (!ctx.membership) return null;

  let order: OrderRow | null = null;
  let vehicle: VehicleRow | null = null;
  let proofRows: DeliveryProofRow[] = [];

  if (isSupabaseAuthConfigured()) {
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const client = admin ?? supabase;
    if (client) {
      const { data: o } = await client
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("company_id", ctx.membership.company_id)
        .eq("assigned_driver_id", ctx.userId)
        .maybeSingle();

      if (!o) return null;
      order = o;

      if (o.assigned_vehicle_id) {
        const { data: v } = await client
          .from("vehicles")
          .select("*")
          .eq("id", o.assigned_vehicle_id)
          .maybeSingle();
        vehicle = v ?? null;
      }

      const { data: p } = await client
        .from("delivery_proofs")
        .select("*")
        .eq("order_id", o.id)
        .order("created_at", { ascending: false });
      proofRows = p ?? [];
    }
  } else if (isDevSandboxActive()) {
    const db = getDevDb();
    order =
      db.orders.find(
        (o) =>
          o.id === orderId &&
          o.company_id === ctx.membership!.company_id &&
          o.assigned_driver_id === ctx.userId
      ) ?? null;
    if (!order) return null;

    if (order.assigned_vehicle_id) {
      vehicle =
        db.vehicles.find((v) => v.id === order!.assigned_vehicle_id) ?? null;
    }
    proofRows = db.deliveryProofs
      .filter((p) => p.order_id === order!.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  if (!order) return null;

  const proofsWithUrls = await Promise.all(
    proofRows.map(async (p) => ({
      ...p,
      signedUrl: await generateProofSignedUrl(p.storage_path),
    }))
  );

  return {
    order: {
      ...order,
      driverName: ctx.profile.full_name || null,
      driverPhone: ctx.profile.phone || null,
      vehicleLabel: vehicle ? formatVehicleLabel(vehicle) : null,
    },
    proofs: proofsWithUrls,
  };
}

export async function getDriverProfileData(ctx: ServerAuthContext): Promise<{
  driverProfile: DriverProfileRow | null;
  assignedVehicle: VehicleRow | null;
  dataRequests: DataRequestRow[];
}> {
  if (!ctx.membership) {
    return { driverProfile: null, assignedVehicle: null, dataRequests: [] };
  }

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const client = admin ?? supabase;
    if (!client) {
      return { driverProfile: null, assignedVehicle: null, dataRequests: [] };
    }

    const [{ data: dp }, { data: dr }] = await Promise.all([
      client
        .from("driver_profiles")
        .select("*")
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      client
        .from("data_requests")
        .select("*")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false }),
    ]);

    let vehicle: VehicleRow | null = null;
    if (dp?.primary_vehicle_id) {
      const { data: v } = await client
        .from("vehicles")
        .select("*")
        .eq("id", dp.primary_vehicle_id)
        .maybeSingle();
      vehicle = v ?? null;
    }

    return {
      driverProfile: dp ?? null,
      assignedVehicle: vehicle,
      dataRequests: dr ?? [],
    };
  }

  if (isDevSandboxActive()) {
    const db = getDevDb();
    const dp =
      db.driverProfiles.find((d) => d.user_id === ctx.userId) ?? null;
    const vehicle = dp?.primary_vehicle_id
      ? db.vehicles.find((v) => v.id === dp.primary_vehicle_id) ?? null
      : null;
    const dataRequests = db.dataRequests
      .filter((r) => r.user_id === ctx.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return { driverProfile: dp, assignedVehicle: vehicle, dataRequests };
  }

  return { driverProfile: null, assignedVehicle: null, dataRequests: [] };
}
