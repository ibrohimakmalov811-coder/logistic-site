"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Navigation,
  PhoneCall,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "./order-status-badge";
import {
  advanceDriverOrderStatusAction,
  confirmDeliveryAction,
} from "@/actions/driver";
import { ALLOWED_DRIVER_TRANSITIONS } from "@/lib/validations/portal";
import type { EnrichedOrder } from "@/lib/portal-service";
import type { DeliveryProofRow, OrderStatus } from "@/types/database";

interface DriverOrderDetailViewProps {
  order: EnrichedOrder;
  proofs: Array<DeliveryProofRow & { signedUrl: string | null }>;
}

export function DriverOrderDetailView({
  order,
  proofs,
}: DriverOrderDetailViewProps) {
  const t = useTranslations("DriverPortal.orderDetail");
  const tStatus = useTranslations("Portal.status");
  const format = useFormatter();
  const router = useRouter();

  const [advancing, setAdvancing] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const nextStepStatus: OrderStatus | undefined =
    ALLOWED_DRIVER_TRANSITIONS[order.status]?.[0];

  const handleAdvanceStatus = async () => {
    if (!nextStepStatus || nextStepStatus === "delivered") return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdvancing(true);
    try {
      const res = await advanceDriverOrderStatusAction(order.id, nextStepStatus);
      if (!res.ok) {
        setErrorMsg(t("updateError"));
        return;
      }
      setSuccessMsg(t("statusUpdated"));
      router.refresh();
    } finally {
      setAdvancing(false);
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile) {
      setErrorMsg(t("photoRequiredError"));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("orderId", order.id);
      formData.append("note", note);
      formData.append("proofPhoto", selectedFile);

      const res = await confirmDeliveryAction(formData);
      if (!res.ok) {
        if (res.errorCode === "FILE_TOO_LARGE") {
          setErrorMsg(t("fileTooLargeError"));
        } else if (res.errorCode === "INVALID_IMAGE_FILE") {
          setErrorMsg(t("invalidImageError"));
        } else {
          setErrorMsg(t("uploadFailedError"));
        }
        return;
      }

      setSuccessMsg(t("deliveryConfirmed"));
      setSelectedFile(null);
      setNote("");
      router.refresh();
    } finally {
      setUploading(false);
    }
  };

  const pickupMapsQuery = encodeURIComponent(order.pickup_address);
  const dropoffMapsQuery = encodeURIComponent(order.delivery_address);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/app/driver"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("backButton")}</span>
        </Link>
        <OrderStatusBadge status={order.status} />
      </div>

      <div>
        <p className="font-mono text-xs font-bold text-primary">
          {order.order_number}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold font-heading mt-0.5">
          {order.pickup_address} &rarr; {order.delivery_address}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {format.dateTime(new Date(order.deadline_at), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      {successMsg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Addresses + Map Deep Links */}
      <div className="rounded-2xl border border-border bg-card/85 p-4 space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {t("pickupPoint")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {order.pickup_address}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${pickupMapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium hover:text-primary min-h-[36px]"
            >
              Google Maps <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={`https://yandex.com/maps/?text=${pickupMapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium hover:text-primary min-h-[36px]"
            >
              Yandex Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="border-t border-border/60 pt-4 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-emerald-500" />
            {t("dropoffPoint")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {order.delivery_address}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${dropoffMapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium hover:text-primary min-h-[36px]"
            >
              Google Maps <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={`https://yandex.com/maps/?text=${dropoffMapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium hover:text-primary min-h-[36px]"
            >
              Yandex Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Cargo & Customer Call Button */}
      <div className="rounded-2xl border border-border bg-card/85 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">{t("cargoLabel")}</p>
            <p className="font-semibold text-foreground mt-0.5">
              {order.cargo_description}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("weightLabel")}</p>
            <p className="font-semibold text-foreground mt-0.5">
              {order.weight_kg ? `${format.number(order.weight_kg)} kg` : "—"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("customerLabel")}</p>
            <p className="text-sm font-semibold">{order.customer_name}</p>
          </div>
          <a
            href={`tel:${order.customer_phone.replace(/\s+/g, "")}`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold min-h-[44px]"
          >
            <PhoneCall className="h-4 w-4" />
            <span>{t("callCustomer")}</span>
          </a>
        </div>
      </div>

      {/* Next Allowed Transition Action Button (non-delivery steps) */}
      {nextStepStatus && nextStepStatus !== "delivered" && (
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full min-h-[54px] text-base font-bold"
          isLoading={advancing}
          onClick={handleAdvanceStatus}
        >
          {t("advanceToButton", { status: tStatus(nextStepStatus) })}
        </Button>
      )}

      {/* Delivery Proof Confirmation Form when In Transit */}
      {order.status === "in_transit" && (
        <form
          onSubmit={handleConfirmDelivery}
          className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold font-heading">
              {t("confirmDeliveryTitle")}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("confirmDeliveryDesc")}
          </p>

          <div className="space-y-1.5">
            <label
              htmlFor="proof-photo-input"
              className="block text-xs font-medium text-foreground"
            >
              {t("photoLabel")}
            </label>
            <input
              id="proof-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:opacity-90"
              required
            />
          </div>

          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("deliveryNotePlaceholder")}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full min-h-[54px] text-base font-bold"
            isLoading={uploading}
          >
            {t("submitDeliveryButton")}
          </Button>
        </form>
      )}

      {/* Existing Delivery Proofs */}
      {proofs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/85 p-4 space-y-3">
          <h2 className="text-sm font-bold">{t("uploadedProofsTitle")}</h2>
          {proofs.map((proof) => (
            <div key={proof.id} className="space-y-2">
              {proof.signedUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proof.signedUrl}
                  alt={t("proofAlt")}
                  className="w-full max-h-64 object-cover rounded-xl border border-border"
                />
              )}
              {proof.note && (
                <p className="text-xs text-muted-foreground">{proof.note}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Phase 2 Coming Soon Toggle */}
      <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 flex items-center justify-between gap-3 opacity-80">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("shareLocationTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("shareLocationComingSoon")}
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="rounded-full bg-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground cursor-not-allowed shrink-0"
        >
          {t("comingSoonBadge")}
        </button>
      </div>
    </div>
  );
}
