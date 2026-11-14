"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  PhoneCall,
  Share2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import {
  DeliveryProofEntity,
  getBlobUrl,
  OrderEntity,
  orderRepo,
  syncChannel,
} from "@/lib/data";
import { DeliveryProofModal } from "@/components/portal/delivery-proof-modal";

export default function DriverOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { currentUser } = useTransFlowAuth();
  const t = useTranslations("DriverPortal.orderDetail");

  const [order, setOrder] = React.useState<OrderEntity | null>(null);
  const [proof, setProof] = React.useState<DeliveryProofEntity | null>(null);
  const [proofUrl, setProofUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [proofModalOpen, setProofModalOpen] = React.useState(false);
  const [isAdvancing, setIsAdvancing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!orderId) return;
    try {
      const o = await orderRepo.findById(orderId);
      setOrder(o);

      if (o) {
        const prf = await orderRepo.getDeliveryProof(orderId);
        setProof(prf);
        if (prf) {
          const url = await getBlobUrl(prf.imageBlobRef);
          setProofUrl(url);
        }
      }
    } catch (err) {
      console.error("Driver order detail load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

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
        <Link href="/app/driver">
          <Button variant="outline">{"Reyslar ro'yxatiga qaytish"}</Button>
        </Link>
      </div>
    );
  }

  const handleStartTransit = async () => {
    if (!currentUser) return;
    setIsAdvancing(true);
    setFeedback(null);
    try {
      await orderRepo.updateStatus(order.id, "in_transit", currentUser.id, "Haydovchi yo'lga chiqdi");
      setFeedback("Holat 'Yo'lda' ga o'zgartirildi!");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsAdvancing(false);
    }
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    order.deliveryAddress
  )}`;

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/driver"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
          aria-label={t("backToOrders")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold font-mono text-foreground">
              #{order.id.slice(0, 8)}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {order.cargoDescription} ({(order.weightKg / 1000).toFixed(1)} t)
          </p>
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

      {/* Prominent Action Bar (Single Touch-Friendly Button) */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        {order.status === "assigned" && (
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={isAdvancing}
            onClick={handleStartTransit}
            className="w-full text-sm font-bold min-h-[50px] shadow-md"
          >
            {isAdvancing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Navigation className="mr-2 h-5 w-5" />
            )}
            {"Yo'lga chiqish (Yuk ortildi)"}
          </Button>
        )}

        {order.status === "in_transit" && (
          <Button
            type="button"
            size="lg"
            onClick={() => setProofModalOpen(true)}
            className="w-full text-sm font-bold min-h-[50px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
          >
            <Camera className="mr-2 h-5 w-5" />
            Yetkazib berishni tasdiqlash (Surat yuklash)
          </Button>
        )}

        {order.status === "delivered" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-sm font-bold">Yuk muvaffaqiyatli topshirildi!</p>
            <p className="text-xs text-muted-foreground mt-0.5">Barcha hujjatlar tasdiqlangan.</p>
          </div>
        )}

        {/* Quick External Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span>Xaritada ochish</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>

          <a
            href={`tel:${order.customerPhone}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <PhoneCall className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{"Mijozga qo'ng'iroq"}</span>
          </a>
        </div>
      </div>

      {/* Route & Cargo Details */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-muted-foreground">
          Reys tafsilotlari
        </h2>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5 rounded-xl bg-secondary/30 p-3">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Yuklash manzili
              </p>
              <p className="font-semibold text-foreground mt-0.5">{order.pickupAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-secondary/30 p-3">
            <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Yetkazish manzili
              </p>
              <p className="font-semibold text-foreground mt-0.5">{order.deliveryAddress}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-muted-foreground">Yuk tavsifi</p>
            <p className="font-semibold text-foreground mt-1">{order.cargoDescription}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-muted-foreground">{"Og'irlik"}</p>
            <p className="font-semibold text-foreground mt-1">
              {(order.weightKg / 1000).toFixed(1)} tonna
            </p>
          </div>
        </div>

        {order.notes && (
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Dispetcher eslatmasi: </span>
            {order.notes}
          </div>
        )}
      </div>

      {/* Proof of Delivery Viewer (if submitted) */}
      {proof && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold font-heading flex items-center gap-1.5 text-foreground">
            <ImageIcon className="h-4 w-4 text-primary" />
            <span>Topshirilganlik dalili (Surat)</span>
          </h2>
          {proofUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofUrl}
              alt="Delivery proof"
              className="w-full max-h-72 object-contain rounded-xl border border-border bg-black/20"
            />
          )}
          {proof.note && (
            <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg">
              Izoh: {proof.note}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(proof.createdAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Coming Soon: Live Location Sharing */}
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-4 text-center">
        <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          Jonli GPS monitoring va Telegram bot
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {"Keyingi bosqichda (Plan B) qo'shiladi · Tez orada"}
        </p>
      </div>

      {/* Delivery Proof Submission Modal */}
      {currentUser && (
        <DeliveryProofModal
          isOpen={proofModalOpen}
          orderId={order.id}
          driverUserId={currentUser.id}
          onClose={() => setProofModalOpen(false)}
          onSuccess={() => {
            setFeedback("Yetkazib berish muvaffaqiyatli tasdiqlandi!");
            loadData();
          }}
        />
      )}
    </div>
  );
}
