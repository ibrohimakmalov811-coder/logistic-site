"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ImageIcon,
  Loader2,
  Phone,
  Truck,
  User,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import {
  companyRepo,
  DeliveryProofEntity,
  getBlobUrl,
  OrderEntity,
  orderRepo,
  OrderStatus,
  OrderStatusHistoryEntity,
  syncChannel,
  UserEntity,
  VehicleEntity,
  vehicleRepo,
} from "@/lib/data";

export default function CompanyOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { currentUser, currentCompany } = useTransFlowAuth();
  const t = useTranslations("CompanyPortal.orderDetail");
  const tStatus = useTranslations("Portal.status");

  const [order, setOrder] = React.useState<OrderEntity | null>(null);
  const [history, setHistory] = React.useState<OrderStatusHistoryEntity[]>([]);
  const [proof, setProof] = React.useState<DeliveryProofEntity | null>(null);
  const [proofUrl, setProofUrl] = React.useState<string | null>(null);
  const [drivers, setDrivers] = React.useState<UserEntity[]>([]);
  const [vehicles, setVehicles] = React.useState<VehicleEntity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Assignment state
  const [selectedDriverId, setSelectedDriverId] = React.useState("");
  const [selectedVehicleId, setSelectedVehicleId] = React.useState("");
  const [isAssigning, setIsAssigning] = React.useState(false);

  // Status transition state
  const [nextStatus, setNextStatus] = React.useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = React.useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!orderId || !currentCompany) return;
    try {
      const o = await orderRepo.findById(orderId);
      if (!o) {
        setOrder(null);
        return;
      }
      setOrder(o);
      setSelectedDriverId(o.driverId || "");
      setSelectedVehicleId(o.vehicleId || "");

      const [hist, prf, mList, vList] = await Promise.all([
        orderRepo.getStatusHistory(orderId),
        orderRepo.getDeliveryProof(orderId),
        companyRepo.getMembers(currentCompany.id),
        vehicleRepo.listByCompany(currentCompany.id),
      ]);

      setHistory(hist);
      setProof(prf);
      if (prf) {
        const url = await getBlobUrl(prf.imageBlobRef);
        setProofUrl(url);
      }
      setDrivers(mList.filter((m) => m.role === "driver").map((m) => m.user));
      setVehicles(vList);
    } catch (err) {
      console.error("Order detail load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, currentCompany]);

  React.useEffect(() => {
    loadData();

    const unsubscribe = syncChannel.subscribe((msg) => {
      if (
        (msg.orderId === orderId &&
          (msg.type === "ORDER_STATUS_CHANGED" || msg.type === "ORDER_ASSIGNED")) ||
        msg.type === "STORAGE_RESET"
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [loadData, orderId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-muted-foreground">Buyurtma topilmadi.</p>
        <Link href="/app/company/orders">
          <Button variant="outline">{"Buyurtmalar ro'yxatiga qaytish"}</Button>
        </Link>
      </div>
    );
  }

  const getAllowedTransitions = (status: OrderStatus): OrderStatus[] => {
    switch (status) {
      case "new":
        return ["assigned", "cancelled"];
      case "assigned":
        return ["in_transit", "cancelled", "new"];
      case "in_transit":
        return ["delivered", "cancelled"];
      default:
        return [];
    }
  };

  const allowedTransitions = getAllowedTransitions(order.status);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsAssigning(true);
    setFeedback(null);

    try {
      await orderRepo.assignDriverAndVehicle(
        order.id,
        selectedDriverId || null,
        selectedVehicleId || null,
        currentUser.id
      );
      setFeedback("Haydovchi va transport muvaffaqiyatli biriktirildi!");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStatus || !currentUser) return;
    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      await orderRepo.updateStatus(order.id, nextStatus, currentUser.id, statusNote);
      setFeedback(`Holat '${tStatus(nextStatus)}' ga o'zgartirildi.`);
      setStatusNote("");
      setNextStatus("");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/app/company/orders"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
            aria-label={t("backToOrders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold font-mono">
                #{order.id.slice(0, 8)}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {order.pickupAddress} → {order.deliveryAddress}
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Route, Proof, and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route & Cargo Details */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold font-heading">{t("routeAndCargo")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="rounded-xl bg-secondary/40 p-3.5">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {t("pickupLabel")}
                </p>
                <p className="font-semibold text-foreground mt-1">{order.pickupAddress}</p>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3.5">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {t("dropoffLabel")}
                </p>
                <p className="font-semibold text-foreground mt-1">{order.deliveryAddress}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
              <div>
                <p className="text-muted-foreground">{t("cargoLabel")}</p>
                <p className="font-medium text-foreground mt-0.5">{order.cargoDescription}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("weightLabel")}</p>
                <p className="font-medium text-foreground mt-0.5">
                  {(order.weightKg / 1000).toFixed(1)} tonna
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("customerLabel")}</p>
                <p className="font-medium text-foreground mt-0.5">{order.customerName}</p>
                <p className="text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" />
                  {order.customerPhone}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Muddat</p>
                <p className="font-medium text-foreground mt-0.5">
                  {new Date(order.deadline).toLocaleString()}
                </p>
              </div>
            </div>

            {order.notes && (
              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Izoh: </span>
                {order.notes}
              </div>
            )}
          </div>

          {/* Delivery Proof Card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold font-heading flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span>{t("proofsTitle")}</span>
            </h2>

            {!proof ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {order.status === "delivered"
                  ? "Yetkazib berilgan, biroq fotosurat biriktirilmagan."
                  : t("noProofsYet")}
              </p>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                {proofUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proofUrl}
                    alt="Delivery proof"
                    className="max-h-72 w-full object-contain rounded-lg border border-border bg-black/20"
                  />
                )}
                {proof.note && (
                  <p className="text-xs font-medium text-foreground">
                    Haydovchi izohi: {proof.note}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Topshirildi: {new Date(proof.createdAt).toLocaleString()} (~
                  {(proof.fileSize / 1024).toFixed(0)} KB)
                </p>
              </div>
            )}
          </div>

          {/* Status History Timeline */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold font-heading">{t("historyTitle")}</h2>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-3">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-xs border-l-2 border-primary/40 pl-3 py-1"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={item.status} />
                        <span className="text-muted-foreground">
                          · {item.changedBy === "company" ? "Kompaniya" : "Haydovchi"}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-muted-foreground mt-1">{item.note}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(item.changedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Driver/Vehicle Assignment & Status Updates */}
        <div className="space-y-6">
          {/* Assignment Box */}
          <form
            onSubmit={handleAssign}
            className="rounded-2xl border border-border bg-card p-5 space-y-4 text-xs"
          >
            <h2 className="text-base font-bold font-heading">{t("assignTitle")}</h2>

            <div className="space-y-1.5">
              <label className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {t("driverLabel")}
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">{t("selectDriver")}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {t("vehicleLabel")}
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">{t("selectVehicle")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.type})
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full"
              disabled={isAssigning}
            >
              {isAssigning ? "Saqlanmoqda..." : t("assignButton")}
            </Button>
          </form>

          {/* Status Change Box */}
          {allowedTransitions.length > 0 && (
            <form
              onSubmit={handleStatusUpdate}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 text-xs"
            >
              <h2 className="text-base font-bold font-heading">
                {t("updateStatusTitle")}
              </h2>

              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">(Keyingi holatni tanlang)</option>
                {allowedTransitions.map((st) => (
                  <option key={st} value={st}>
                    {tStatus(st)}
                  </option>
                ))}
              </select>

              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />

              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isUpdatingStatus || !nextStatus}
              >
                {isUpdatingStatus ? "Yangilanmoqda..." : t("updateStatusButton")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
