"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Search, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OrderStatusBadge } from "./order-status-badge";
import { createOrderAction } from "@/actions/company";
import { ORDER_STATUSES } from "@/lib/validations/portal";
import type { EnrichedOrder } from "@/lib/portal-service";
import type { OrderStatus } from "@/types/database";

interface CompanyOrdersViewProps {
  orders: EnrichedOrder[];
  totalCount: number;
  page: number;
  pageSize: number;
  initialQuery: string;
  initialStatus: OrderStatus | "all";
  openNewModalInitially?: boolean;
  drivers: Array<{ id: string; fullName: string; phone: string | null }>;
  vehicles: Array<{ id: string; label: string; plateNumber: string }>;
}

export function CompanyOrdersView({
  orders,
  totalCount,
  page,
  pageSize,
  initialQuery,
  initialStatus,
  openNewModalInitially = false,
  drivers,
  vehicles,
}: CompanyOrdersViewProps) {
  const t = useTranslations("CompanyPortal.orders");
  const tStatus = useTranslations("Portal.status");
  const format = useFormatter();
  const router = useRouter();

  const [searchQ, setSearchQ] = React.useState(initialQuery);
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">(
    initialStatus
  );
  const [modalOpen, setModalOpen] = React.useState(openNewModalInitially);

  // Create order form state
  const [pickupAddress, setPickupAddress] = React.useState("");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [cargoDescription, setCargoDescription] = React.useState("");
  const [weightKg, setWeightKg] = React.useState("1000");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("+998 ");
  const [priceUzs, setPriceUzs] = React.useState("");
  const [deadlineAt, setDeadlineAt] = React.useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [assignedDriverId, setAssignedDriverId] = React.useState("");
  const [assignedVehicleId, setAssignedVehicleId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const applyFilter = (nextQ: string, nextStatus: OrderStatus | "all", nextPage = 1) => {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await createOrderAction({
        pickupAddress,
        deliveryAddress,
        cargoDescription,
        weightKg: Number(weightKg) || 1,
        customerName,
        customerPhone,
        priceUzs: priceUzs ? Number(priceUzs) : undefined,
        deadlineAt: new Date(deadlineAt).toISOString(),
        assignedDriverId: assignedDriverId || undefined,
        assignedVehicleId: assignedVehicleId || undefined,
        notes: notes || null,
      });

      if (!res.ok) {
        setErrorMsg(t("createError"));
        return;
      }

      setModalOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle", { count: totalCount })}
          </p>
        </div>

        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("createButton")}
        </Button>
      </div>

      {/* Filters Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilter(searchQ, statusFilter, 1);
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-11"
          />
        </div>
        <div className="w-full sm:w-52">
          <Select
            aria-label={t("filterStatusLabel")}
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value as OrderStatus | "all";
              setStatusFilter(val);
              applyFilter(searchQ, val, 1);
            }}
          >
            <option value="all">{t("allStatuses")}</option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {tStatus(st)}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          {t("filterButton")}
        </Button>
      </form>

      {/* Orders List / Table */}
      <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-6">
        {orders.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("emptyDesc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">{t("colOrder")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colRoute")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colCustomer")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colDriverVehicle")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colStatus")}</th>
                  <th className="pb-3 font-medium text-right">{t("colPrice")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/30">
                    <td className="py-3.5 pr-4 font-mono text-xs font-semibold whitespace-nowrap">
                      <Link
                        href={`/app/company/orders/${order.id}`}
                        className="text-primary hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4 min-w-[180px]">
                      <p className="font-medium text-foreground">
                        {order.pickup_address} &rarr; {order.delivery_address}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {order.cargo_description}
                      </p>
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      <p className="font-medium text-foreground">{order.customer_name}</p>
                      <p className="text-muted-foreground">{order.customer_phone}</p>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                      <p>{order.driverName ?? t("unassigned")}</p>
                      {order.vehicleLabel && <p>{order.vehicleLabel}</p>}
                    </td>
                    <td className="py-3.5 pr-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 text-right text-xs font-medium whitespace-nowrap">
                      {order.price_uzs
                        ? `${format.number(order.price_uzs)} UZS`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t("pageInfo", { page, totalPages })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => applyFilter(searchQ, statusFilter, page - 1)}
              >
                {t("prevPage")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => applyFilter(searchQ, statusFilter, page + 1)}
              >
                {t("nextPage")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-order-title"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2
                id="create-order-title"
                className="text-xl font-bold font-heading"
              >
                {t("createModalTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label={t("closeModal")}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.pickupAddress")}</label>
                  <Input
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.dropoffAddress")}</label>
                  <Input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium">{t("fields.cargo")}</label>
                  <Input
                    value={cargoDescription}
                    onChange={(e) => setCargoDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.weightKg")}</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.customerName")}</label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.customerPhone")}</label>
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.priceUzs")}</label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={priceUzs}
                    onChange={(e) => setPriceUzs(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("fields.promisedTime")}</label>
                <Input
                  type="datetime-local"
                  value={deadlineAt}
                  onChange={(e) => setDeadlineAt(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.assignDriver")}</label>
                  <Select
                    value={assignedDriverId}
                    onChange={(e) => setAssignedDriverId(e.target.value)}
                  >
                    <option value="">{t("unassigned")}</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t("fields.assignVehicle")}</label>
                  <Select
                    value={assignedVehicleId}
                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                  >
                    <option value="">{t("unassigned")}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("fields.notes")}</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  {t("cancelButton")}
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting}>
                  {t("saveOrderButton")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
