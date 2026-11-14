"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, MapPin, Package } from "lucide-react";
import { Link } from "@/i18n/routing";
import { OrderStatusBadge } from "./order-status-badge";
import type { EnrichedOrder } from "@/lib/portal-service";
import { cn } from "@/lib/utils";

interface DriverOrdersViewProps {
  current: EnrichedOrder[];
  upcoming: EnrichedOrder[];
  completed: EnrichedOrder[];
}

export function DriverOrdersView({
  current,
  upcoming,
  completed,
}: DriverOrdersViewProps) {
  const t = useTranslations("DriverPortal.orders");
  const format = useFormatter();

  const [tab, setTab] = React.useState<"current" | "upcoming" | "completed">(
    current.length > 0 ? "current" : upcoming.length > 0 ? "upcoming" : "current"
  );

  const activeList =
    tab === "current" ? current : tab === "upcoming" ? upcoming : completed;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading">{t("title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* Large Touch-Friendly Tabs */}
      <div
        role="tablist"
        aria-label={t("tabsAria")}
        className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card/70 p-1.5"
      >
        {(
          [
            { key: "current", label: t("tabCurrent", { count: current.length }) },
            { key: "upcoming", label: t("tabUpcoming", { count: upcoming.length }) },
            {
              key: "completed",
              label: t("tabCompleted", { count: completed.length }),
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
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {activeList.length === 0 ? (
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
              className="block rounded-2xl border border-border bg-card/85 p-4 sm:p-5 hover:border-primary/60 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-primary">
                  {order.order_number}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="flex items-start gap-2.5 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {order.pickup_address} &rarr; {order.delivery_address}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{order.cargo_description}</span>
              </div>

              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {format.dateTime(new Date(order.deadline_at), {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
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
