"use client";

import * as React from "react";
import { Camera, CheckCircle2, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { orderRepo } from "@/lib/data";

interface DeliveryProofModalProps {
  orderId: string;
  driverUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeliveryProofModal({
  orderId,
  driverUserId,
  isOpen,
  onClose,
  onSuccess,
}: DeliveryProofModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [compressedDataUrl, setCompressedDataUrl] = React.useState<string | null>(null);
  const [fileSizeKb, setFileSizeKb] = React.useState<number | null>(null);
  const [note, setNote] = React.useState("");
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1280;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Canvas context is unavailable"));
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsCompressing(true);

    try {
      const compressed = await compressImage(file);
      setCompressedDataUrl(compressed);
      setPreviewUrl(compressed);
      const approxKb = Math.round((compressed.length * 3) / 4 / 1024);
      setFileSizeKb(approxKb);
    } catch (err) {
      console.error("Compression error:", err);
      setErrorMsg("Rasmni qayta ishlashda xatolik yuz berdi.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compressedDataUrl) {
      setErrorMsg("Iltimos, yetkazib berilganlikni tasdiqlovchi suratni yuklang.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await orderRepo.submitDeliveryProof(
        orderId,
        driverUserId,
        compressedDataUrl,
        "image/jpeg",
        note.trim()
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to submit delivery proof:", err);
      setErrorMsg(err instanceof Error ? err.message : "Tasdiqlashda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold font-heading">Yetkazib berishni tasdiqlash</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yuk xati, imzo yoki tushirilgan yuk fotosuratini biriktiring
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {errorMsg && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Photo Dropzone / Preview */}
          {previewUrl ? (
            <div className="relative rounded-xl border border-border overflow-hidden bg-muted/40 p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Delivery proof preview"
                className="max-h-56 mx-auto rounded-lg object-contain shadow-sm"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Hajmi: ~{fileSizeKb} KB (optimallashtirildi)</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline font-medium"
                >
                  Boshqa rasm tanlash
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary/80 bg-primary/5 p-6 text-center transition-all"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isCompressing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                Suratga olish yoki fayl tanlash
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG yoki WebP (avtomatik siqiladi)
              </p>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1">
            <label htmlFor="proof-note" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {"Qo'shimcha izoh (ixtiyoriy)"}
            </label>
            <textarea
              id="proof-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Omborda qabul qilindi, imzo qo'yildi"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !compressedDataUrl}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Yetkazildi deb tasdiqlash
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
