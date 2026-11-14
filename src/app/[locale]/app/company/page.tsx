"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Plus,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import {
  CompanyEntity,
  OrderEntity,
  orderRepo,
  syncChannel,
  UserEntity,
  VehicleEntity,
  vehicleRepo,
  companyRepo,
} from "@/lib/data";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { Button } from "@/components/ui/button";

export default function CompanyOverviewPage() {
  const { currentCompany } = useTransFlowAuth();
  const t = useTranslations("CompanyPortal.overview");

  const [orders, setOrders] = React.useState<OrderEntity[]>([]);
  const [vehicles, setVehicles] = React.useState<VehicleEntity[]>([]);
  const [members, setMembers] = React.useState<Array<{ user: UserEntity }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    if (!currentCompany) return;
    try {
      const [ordersRes, vList, mList] = await Promise.all([
        orderRepo.listByCompany(currentCompany.id, { limit: 100 }),
        vehicleRepo.listByCompany(currentCompany.id),
        companyRepo.getMembers(currentCompany.id),
      ]);
      setOrders(ordersRes.orders);
      setVehicles(vList);
      setMembers(mList);
    } catch (err) {
      console.error("Overview data load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany]);

  React.useEffect(() => {
    loadData();

    const unsubscribe = syncChannel.subscribe((msg) => {
      if (
        msg.type === "ORDER_CREATED" ||
        msg.type === "ORDER_STATUS_CHANGED" ||
        msg.type === "ORDER_ASSIGNED" ||
        msg.type === "VEHICLE_ADDED" ||
        msg.type === "STORAGE_RESET"
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const activeOrdersCount = orders.filter(
    (o) => o.status === "new" || o.status === "assigned" || o.status === "in_transit"
  ).length;

  const deliveredTodayCount = orders.filter((o) => {
    if (o.status !== "delivered") return false;
    const today = new Date().toISOString().slice(0, 10);
    return o.updatedAt.slice(0, 10) === today;
  }).length;

  const driversList = members.filter((m) => m.user.role === "driver");
  const availableDriversCount = driversList.length;
  const activeVehiclesCount = vehicles.filter((v) => v.status === "active").length;

  const delayedCount = orders.filter((o) => {
    if (o.status === "delivered" || o.status === "cancelled") return false;
    return new Date(o.deadline).getTime() < Date.now();
  }).length;

  const recentOrders = orders.slice(0, 5);

  const kpis = [
    {
      label: t("kpiActiveOrders"),
      value: activeOrdersCount,
      icon: ClipboardList,
      tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    },
    {
      label: t("kpiDeliveredToday"),
      value: deliveredTodayCount,
      icon: CheckCircle2,
      tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    },
    {
      label: t("kpiAvailableDrivers"),
      value: availableDriversCount,
      icon: Users,
      tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    },
    {
      label: t("kpiActiveVehicles"),
      value: activeVehiclesCount,
      icon: Truck,
      tone: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
    },
    {
      label: t("kpiDelayed"),
      value: delayedCount,
      icon: AlertTriangle,
      tone:
        delayedCount > 0
          ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
          : "text-muted-foreground bg-secondary",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle", { company: currentCompany?.name ?? siteConfig.name })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link href="/app/company/orders?new=1">
            <Button variant="primary" size="md">
              <Plus className="mr-1.5 h-4 w-4" />
              {t("quickNewOrder")}
            </Button>
          </Link>
          <Link href="/app/company/drivers">
            <Button variant="outline" size="md">
              {t("quickInviteDriver")}
            </Button>
          </Link>
          <Link href="/app/company/vehicles">
            <Button variant="outline" size="md">
              {t("quickAddVehicle")}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-heading text-foreground">
                  {kpi.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-heading text-foreground">
              {t("recentOrdersTitle")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("recentOrdersSubtitle")}
            </p>
          </div>
          <Link
            href="/app/company/orders"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            {t("viewAllOrders")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("noOrders")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Buyurtma</th>
                  <th className="px-4 py-3">{"Yo'nalish"}</th>
                  <th className="px-4 py-3">{"Yuk / Og'irlik"}</th>
                  <th className="px-4 py-3">Mijoz</th>
                  <th className="px-4 py-3">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      <Link
                        href={`/app/company/orders/${o.id}`}
                        className="text-primary hover:underline"
                      >
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{o.pickupAddress}</div>
                      <div className="text-muted-foreground">→ {o.deliveryAddress}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{o.cargoDescription}</div>
                      <div className="text-muted-foreground">
                        {(o.weightKg / 1000).toFixed(1)} t
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{o.customerName}</div>
                      <div className="text-muted-foreground font-mono">{o.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
