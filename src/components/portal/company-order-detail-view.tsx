"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ImageIcon, Phone, Truck, User } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OrderStatusBadge } from "./order-status-badge";
import {
  assignOrderAction,
  updateOrderStatusManagerAction,
} from "@/actions/company";
import { ALLOWED_MANAGER_TRANSITIONS } from "@/lib/validations/portal";
import type { OrderDetailBundle } from "@/lib/portal-service";
import type { OrderStatus } from "@/types/database";

interface CompanyOrderDetailViewProps {
  bundle: OrderDetailBundle;
}

export function CompanyOrderDetailView({ bundle }: CompanyOrderDetailViewProps) {
  const t = useTranslations("CompanyPortal.orderDetail");
  const tStatus = useTranslations("Portal.status");
  const format = useFormatter();
  const router = useRouter();

  const { order, history, proofs, drivers, vehicles } = bundle;
  const [driverId, setDriverId] = React.useState(order.assigned_driver_id ?? "");
  const [vehicleId, setVehicleId] = React.useState(
    order.assigned_vehicle_id ?? ""
  );
  const [assigning, setAssigning] = React.useState(false);

  const allowedTransitions = ALLOWED_MANAGER_TRANSITIONS[order.status] ?? [];
  const [nextStatus, setNextStatus] = React.useState<OrderStatus | "">(
    allowedTransitions[0] ?? ""
  );
  const [statusNote, setStatusNote] = React.useState("");
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !vehicleId) return;
    setAssigning(true);
    setFeedback(null);
    try {
      const res = await assignOrderAction(order.id, { driverId, vehicleId });
      if (res.ok) {
        setFeedback(t("assignedSaved"));
        router.refresh();
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStatus) return;
    setUpdatingStatus(true);
    setFeedback(null);
    try {
      const res = await updateOrderStatusManagerAction(order.id, {
        nextStatus,
        note: statusNote || undefined,
      });
      if (res.ok) {
        setStatusNote("");
        setFeedback(t("statusUpdated"));
        router.refresh();
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/app/company/orders"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary"
            aria-label={t("backToOrders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold font-mono">
                {order.order_number}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {order.pickup_address} &rarr; {order.delivery_address}
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details + Proofs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold font-heading">{t("routeAndCargo")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-secondary/40 p-3.5">
                <p className="text-xs text-muted-foreground">{t("pickupLabel")}</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {order.pickup_address}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3.5">
                <p className="text-xs text-muted-foreground">{t("dropoffLabel")}</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {order.delivery_address}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
              <div>
                <p className="text-muted-foreground">{t("cargoLabel")}</p>
                <p className="font-medium text-foreground mt-0.5">
                  {order.cargo_description}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("weightLabel")}</p>
                <p className="font-medium text-foreground mt-0.5">
                  {order.weight_kg ? `${format.number(order.weight_kg)} kg` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("customerLabel")}</p>
                <p className="font-medium text-foreground mt-0.5">
                  {order.customer_name}
                </p>
                <p className="text-muted-foreground inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {order.customer_phone}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("priceLabel")}</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {order.price_uzs ? `${format.number(order.price_uzs)} UZS` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Proof Viewer */}
          <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold font-heading flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span>{t("proofsTitle")}</span>
            </h2>

            {proofs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noProofsYet")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2"
                  >
                    {proof.signedUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proof.signedUrl}
                        alt={t("proofAlt")}
                        className="w-full h-48 object-cover rounded-lg border border-border"
                      />
                    )}
                    {proof.note && (
                      <p className="text-xs text-foreground">{proof.note}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {format.dateTime(new Date(proof.created_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status History Timeline */}
          <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold font-heading">{t("historyTitle")}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-3">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-xs border-l-2 border-primary/40 pl-3 py-1"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={item.to_status} />
                        {item.actorName && (
                          <span className="text-muted-foreground">
                            &middot; {item.actorName}
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <p className="text-muted-foreground mt-1">{item.note}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {format.dateTime(new Date(item.created_at), {
                        month: "short",
                        day: "numeric",
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

        {/* Right: Assignment & Status Controls */}
        <div className="space-y-6">
          <form
            onSubmit={handleAssign}
            className="rounded-2xl border border-border bg-card/80 p-5 space-y-4"
          >
            <h2 className="text-base font-bold font-heading">{t("assignTitle")}</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {t("driverLabel")}
              </label>
              <Select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
              >
                <option value="">{t("selectDriver")}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {t("vehicleLabel")}
              </label>
              <Select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
              >
                <option value="">{t("selectVehicle")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={assigning}
            >
              {t("assignButton")}
            </Button>
          </form>

          {allowedTransitions.length > 0 && (
            <form
              onSubmit={handleStatusUpdate}
              className="rounded-2xl border border-border bg-card/80 p-5 space-y-4"
            >
              <h2 className="text-base font-bold font-heading">
                {t("updateStatusTitle")}
              </h2>

              <Select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
              >
                {allowedTransitions.map((st) => (
                  <option key={st} value={st}>
                    {tStatus(st)}
                  </option>
                ))}
              </Select>

              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />

              <Button
                type="submit"
                variant="outline"
                className="w-full"
                isLoading={updatingStatus}
              >
                {t("updateStatusButton")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
