"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2, MapPin, Package, Truck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { OrderEntity, orderRepo, syncChannel } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function DriverDashboardPage() {
  const { currentUser, currentCompany } = useTransFlowAuth();
  const t = useTranslations("DriverPortal.orders");

  const [orders, setOrders] = React.useState<OrderEntity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"current" | "upcoming" | "completed">("current");

  const loadOrders = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await orderRepo.listByDriver(currentUser.id, { limit: 100 });
      setOrders(res.orders);
    } catch (err) {
      console.error("Driver orders load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    loadOrders();

    const unsubscribe = syncChannel.subscribe((msg) => {
      if (
        msg.type === "ORDER_CREATED" ||
        msg.type === "ORDER_STATUS_CHANGED" ||
        msg.type === "ORDER_ASSIGNED" ||
        msg.type === "STORAGE_RESET"
      ) {
        loadOrders();
      }
    });

    return () => unsubscribe();
  }, [loadOrders]);

  const currentOrders = orders.filter((o) => o.status === "in_transit");
  const upcomingOrders = orders.filter((o) => o.status === "assigned");
  const completedOrders = orders.filter((o) => o.status === "delivered");

  const activeList =
    tab === "current" ? currentOrders : tab === "upcoming" ? upcomingOrders : completedOrders;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading">{t("title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {currentCompany?.name ?? "Kompaniyangiz"} · {currentUser?.fullName}
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t("tabsAria")}
        className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card/70 p-1.5"
      >
        {(
          [
            { key: "current", label: t("tabCurrent", { count: currentOrders.length }) },
            { key: "upcoming", label: t("tabUpcoming", { count: upcomingOrders.length }) },
            {
              key: "completed",
              label: t("tabCompleted", { count: completedOrders.length }),
            },
          ] as const
        ).map((item) => {
          const selected = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.key)}
              className={cn(
                "rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold transition-colors min-h-[44px]",
                selected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {activeList.map((order) => (
            <Link
              key={order.id}
              href={`/app/driver/orders/${order.id}`}
              className="block rounded-2xl border border-border bg-card/90 p-4 sm:p-5 hover:border-primary/60 transition-all shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-primary">
                  #{order.id.slice(0, 8)}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="flex items-start gap-2.5 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {order.pickupAddress} → {order.deliveryAddress}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {order.cargoDescription} ({(order.weightKg / 1000).toFixed(1)} t)
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>Muddat: {new Date(order.deadline).toLocaleDateString()}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  {t("openOrder")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
