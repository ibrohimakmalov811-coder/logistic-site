"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
  assigned: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  in_transit: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  delivered:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const t = useTranslations("Portal.status");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_STYLE[status],
        className
      )}
    >
      {t(status)}
    </span>
  );
}
