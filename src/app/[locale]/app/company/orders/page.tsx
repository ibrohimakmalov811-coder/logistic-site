"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus, Search, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import {
  companyRepo,
  OrderEntity,
  orderRepo,
  OrderStatus,
  syncChannel,
  UserEntity,
  VehicleEntity,
  vehicleRepo,
} from "@/lib/data";

const STATUS_OPTIONS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "Barchasi" },
  { value: "new", label: "Yangi" },
  { value: "assigned", label: "Biriktirilgan" },
  { value: "in_transit", label: "Yo'lda" },
  { value: "delivered", label: "Yetkazilgan" },
  { value: "cancelled", label: "Bekor qilingan" },
];

export default function CompanyOrdersPage() {
  const { currentCompany } = useTransFlowAuth();
  const t = useTranslations("CompanyPortal.orders");
  const searchParams = useSearchParams();

  const [orders, setOrders] = React.useState<OrderEntity[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [drivers, setDrivers] = React.useState<UserEntity[]>([]);
  const [vehicles, setVehicles] = React.useState<VehicleEntity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters & Pagination
  const [searchQ, setSearchQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Create Order Modal State
  const [modalOpen, setModalOpen] = React.useState(searchParams.get("new") === "1");
  const [pickupAddress, setPickupAddress] = React.useState("");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [cargoDescription, setCargoDescription] = React.useState("");
  const [weightKg, setWeightKg] = React.useState("5000");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("+998 ");
  const [deadlineAt, setDeadlineAt] = React.useState(() => {
    const d = new Date(Date.now() + 48 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [assignedDriverId, setAssignedDriverId] = React.useState("");
  const [assignedVehicleId, setAssignedVehicleId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadOrders = React.useCallback(async () => {
    if (!currentCompany) return;
    try {
      const res = await orderRepo.listByCompany(currentCompany.id, {
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQ,
        page,
        limit: pageSize,
      });
      setOrders(res.orders);
      setTotalCount(res.total);

      const [mList, vList] = await Promise.all([
        companyRepo.getMembers(currentCompany.id),
        vehicleRepo.listByCompany(currentCompany.id),
      ]);
      setDrivers(mList.filter((m) => m.role === "driver").map((m) => m.user));
      setVehicles(vList);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany, statusFilter, searchQ, page, pageSize]);

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setErrorMsg(null);

    if (pickupAddress.trim().length < 3) {
      setErrorMsg("Yuklash manzili kiritilishi shart.");
      return;
    }
    if (deliveryAddress.trim().length < 3) {
      setErrorMsg("Yetkazish manzili kiritilishi shart.");
      return;
    }
    if (cargoDescription.trim().length < 2) {
      setErrorMsg("Yuk tavsifi kiritilishi shart.");
      return;
    }

    setSubmitting(true);
    try {
      await orderRepo.create({
        companyId: currentCompany.id,
        pickupAddress: pickupAddress.trim(),
        deliveryAddress: deliveryAddress.trim(),
        cargoDescription: cargoDescription.trim(),
        weightKg: Number(weightKg) || 1000,
        deadline: new Date(deadlineAt).toISOString(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim(),
        driverId: assignedDriverId || null,
        vehicleId: assignedVehicleId || null,
      });

      setModalOpen(false);
      // Reset form
      setPickupAddress("");
      setDeliveryAddress("");
      setCargoDescription("");
      setCustomerName("");
      setCustomerPhone("+998 ");
      setAssignedDriverId("");
      setAssignedVehicleId("");
      setNotes("");

      await loadOrders();
    } catch (err: unknown) {
      console.error("Order creation error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Buyurtma yaratishda xatolik yuz berdi.");
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrderStatus | "all");
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">{t("colOrder")}</th>
                <th className="px-4 py-3">{t("colRoute")}</th>
                <th className="px-4 py-3">{t("colCustomer")}</th>
                <th className="px-4 py-3">{t("colDriverVehicle")}</th>
                <th className="px-4 py-3">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    {t("emptyTitle")}
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const driver = drivers.find((d) => d.id === o.driverId);
                  const vehicle = vehicles.find((v) => v.id === o.vehicleId);
                  return (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">
                        <Link
                          href={`/app/company/orders/${o.id}`}
                          className="text-primary hover:underline font-bold"
                        >
                          #{o.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{o.pickupAddress}</div>
                        <div className="text-muted-foreground">→ {o.deliveryAddress}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {o.cargoDescription} ({(o.weightKg / 1000).toFixed(1)} t)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{o.customerName}</div>
                        <div className="text-muted-foreground font-mono">{o.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        {driver ? (
                          <div className="font-medium text-foreground">{driver.fullName}</div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {t("unassigned")}
                          </span>
                        )}
                        {vehicle && (
                          <div className="text-muted-foreground font-mono text-[11px]">
                            {vehicle.plateNumber} ({vehicle.type})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <span>
              Sahifa {page} / {totalPages} (Jami {totalCount})
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Oldingi
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Keyingi
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-heading">{t("createModalTitle")}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 mt-4 text-xs">
              {errorMsg && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("fields.pickupAddress")}
                  </label>
                  <Input
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Toshkent, Sergeli ombori"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("fields.deliveryAddress")}
                  </label>
                  <Input
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Samarqand, Markaziy bozor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("fields.cargoDescription")}
                  </label>
                  <Input
                    required
                    value={cargoDescription}
                    onChange={(e) => setCargoDescription(e.target.value)}
                    placeholder="Qurilish materiallari"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("fields.weightKg")}
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("fields.customerName")}
                  </label>
                  <Input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Samarqand Qurilish MCHJ"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("fields.customerPhone")}
                  </label>
                  <Input
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("fields.deadlineAt")}
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={deadlineAt}
                  onChange={(e) => setDeadlineAt(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Haydovchi biriktirish
                  </label>
                  <select
                    value={assignedDriverId}
                    onChange={(e) => setAssignedDriverId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">(Keyinroq biriktirish)</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Transport vositasi
                  </label>
                  <select
                    value={assignedVehicleId}
                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">(Keyinroq biriktirish)</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("fields.notes")}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Kran talab qilinadi..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  {t("cancelButton")}
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    t("saveOrderButton")
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
