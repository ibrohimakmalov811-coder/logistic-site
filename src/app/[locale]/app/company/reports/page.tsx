"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BarChart3, CheckCircle2, Clock, Loader2, TrendingUp } from "lucide-react";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { OrderEntity, orderRepo, syncChannel } from "@/lib/data";

export default function CompanyReportsPage() {
  const { currentCompany } = useTransFlowAuth();
  const t = useTranslations("CompanyPortal.reports");

  const [orders, setOrders] = React.useState<OrderEntity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    if (!currentCompany) return;
    try {
      const res = await orderRepo.listByCompany(currentCompany.id, { limit: 500 });
      setOrders(res.orders);
    } catch (err) {
      console.error("Reports load error:", err);
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
        msg.type === "STORAGE_RESET"
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const totalOrders = orders.length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const activeCount = orders.filter(
    (o) => o.status === "in_transit" || o.status === "assigned"
  ).length;
  const delayedCount = orders.filter((o) => {
    if (o.status === "delivered" || o.status === "cancelled") return false;
    return new Date(o.deadline).getTime() < Date.now();
  }).length;

  const totalTonnage = orders.reduce((acc, o) => acc + o.weightKg, 0) / 1000;

  // 7-day series
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString([], { weekday: "short" });
    const deliveredOnDay = orders.filter(
      (o) => o.status === "delivered" && o.updatedAt.slice(0, 10) === dateStr
    ).length;
    const createdOnDay = orders.filter((o) => o.createdAt.slice(0, 10) === dateStr).length;

    return {
      dayLabel: dayName,
      dateStr,
      delivered: deliveredOnDay,
      created: createdOnDay,
    };
  });

  const maxBar = Math.max(
    1,
    ...last7Days.map((d) => Math.max(d.delivered, d.created))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("totalOrders")}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold font-heading text-foreground">
            {totalOrders}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("deliveredCount")}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400">
            {deliveredCount}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("delayedCount")}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold font-heading text-rose-600 dark:text-rose-400">
            {delayedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Jami tashilgan yuk
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold font-heading text-foreground">
            {totalTonnage.toFixed(1)} t
          </p>
        </div>
      </div>

      {/* 7-Day Performance Chart */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold font-heading flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>{t("chartTitle")}</span>
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
              Yetkazilgan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" />
              Yangi buyurtma
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 560 220"
              className="w-full h-52 min-w-[360px]"
              role="img"
              aria-label={t("chartTitle")}
            >
              <line
                x1="24"
                y1="180"
                x2="540"
                y2="180"
                stroke="currentColor"
                strokeOpacity="0.18"
              />
              {last7Days.map((day, idx) => {
                const groupX = 38 + idx * 72;
                const deliveredH = Math.round((day.delivered / maxBar) * 140);
                const createdH = Math.round((day.created / maxBar) * 140);
                return (
                  <g key={day.dateStr}>
                    <rect
                      x={groupX}
                      y={180 - deliveredH}
                      width={18}
                      height={Math.max(2, deliveredH)}
                      rx={3}
                      fill="#10B981"
                    />
                    <rect
                      x={groupX + 22}
                      y={180 - createdH}
                      width={18}
                      height={Math.max(2, createdH)}
                      rx={3}
                      fill="#3B82F6"
                    />
                    <text
                      x={groupX + 20}
                      y={202}
                      textAnchor="middle"
                      fontSize="11"
                      fill="currentColor"
                      opacity="0.6"
                    >
                      {day.dayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
