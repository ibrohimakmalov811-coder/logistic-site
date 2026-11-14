"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  LogOut,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  Truck,
  User,
  X,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import {
  getCurrentUser,
  logoutUser,
  updateUserAvatar,
  type LocalUser,
} from "@/lib/storage-auth";

export function PersonalInfoView() {
  const t = useTranslations("PersonalInfo");
  const tRoles = useTranslations("Auth.signup.roles");
  const router = useRouter();

  const [user, setUser] = React.useState<LocalUser | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Avatar source selection modal
  const [isSourceChoiceOpen, setIsSourceChoiceOpen] = React.useState(false);
  // Live camera modal
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = React.useState<string | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraFallbackInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.replace("/login");
  };

  // Helper to resize/compress avatar to clean 256x256 base64 to conserve localStorage space
  const processAndSaveAvatar = (imageSrc: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Center crop square
      const minDim = Math.min(img.width, img.height);
      const startX = (img.width - minDim) / 2;
      const startY = (img.height - minDim) / 2;

      ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);

      if (user) {
        updateUserAvatar(user.id, base64);
        setUser(getCurrentUser());
        setSuccessNotice(t("avatarSavedSuccess"));
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    };
    img.src = imageSrc;
  };

  // Gallery Picker
  const handleGalleryClick = () => {
    setIsSourceChoiceOpen(false);
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        processAndSaveAvatar(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Camera Live Capture
  const handleCameraClick = async () => {
    setIsSourceChoiceOpen(false);
    setCameraError(null);
    setCapturedPhoto(null);
    setIsCameraOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("[Camera error]", err);
      setCameraError(t("cameraError"));
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPhoto(null);
    setCameraError(null);
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(dataUrl);
    stopCameraStream();
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    handleCameraClick();
  };

  const handleConfirmCapturedPhoto = () => {
    if (capturedPhoto) {
      processAndSaveAvatar(capturedPhoto);
      closeCameraModal();
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const roleTitle =
    user.role === "company_owner"
      ? tRoles("owner.title")
      : user.role === "dispatcher"
        ? tRoles("dispatcher.title")
        : tRoles("driver.title");

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "TF";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hidden file input for gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Hidden fallback file input for mobile camera */}
      <input
        ref={cameraFallbackInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm">
        <div className="container mx-auto max-w-7xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="hidden sm:inline-block h-5 w-[1px] bg-border" />
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("title")}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle size="sm" />
            <LanguageSwitcher align="right" />

            {/* Back to Cabinet button */}
            <Link
              href="/cabinet"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("backToCabinet")}</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 px-3 py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl flex-1 px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between border-b border-border/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          <Link
            href="/cabinet"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("backToCabinet")}</span>
          </Link>
        </div>

        {successNotice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* STEP 6: Avatar Card with Change Avatar button */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="relative group shrink-0">
            {user.avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatar}
                alt={user.fullName || "Avatar"}
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-4 border-primary/30 shadow-lg ring-4 ring-primary/10"
              />
            ) : (
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-heading font-black text-3xl shadow-lg ring-4 ring-primary/10">
                {initials}
              </div>
            )}
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {t("avatarTitle")}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Suratingiz profil va tizim hisobotlarida aks etadi.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsSourceChoiceOpen(true)}
              className="inline-flex items-center gap-2 font-semibold shadow-xs"
            >
              <Camera className="h-4 w-4" />
              <span>{t("changeAvatar")}</span>
            </Button>
          </div>
        </div>

        {/* STEP 5: All Registered Information Display */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-foreground border-b border-border/60 pb-3">
            {t("subtitle")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {t("fullName")}
              </span>
              <p className="text-base font-bold text-foreground">
                {user.fullName || "—"}
              </p>
            </div>

            {/* Phone */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                {t("phone")}
              </span>
              <p className="text-base font-bold font-mono text-foreground">
                {user.phone || "—"}
              </p>
            </div>

            {/* Email */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                {t("email")}
              </span>
              <p className="text-base font-bold text-foreground break-all">
                {user.email || "—"}
              </p>
            </div>

            {/* Role */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                {t("role")}
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                  {user.role === "driver" ? (
                    <Truck className="h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                  {roleTitle}
                </span>
              </div>
            </div>

            {/* Citizenship */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                {t("citizenship")}
              </span>
              <p className="text-base font-bold text-foreground">
                {user.citizenship || "—"}
              </p>
            </div>

            {/* Residence Country */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {t("residenceCountry")}
              </span>
              <p className="text-base font-bold text-foreground">
                {user.residenceCountry || "—"}
              </p>
            </div>

            {/* Registration Date */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {t("registeredDate")}
              </span>
              <p className="text-sm font-medium font-mono text-foreground">
                {new Date(user.createdAt).toLocaleString("uz-UZ", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* STEP 6: Source Choice Modal (Camera vs Gallery) */}
      {isSourceChoiceOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-bold text-base text-foreground">
                {t("chooseSourceTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setIsSourceChoiceOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Choice 1: Camera */}
              <button
                type="button"
                onClick={handleCameraClick}
                className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-border bg-secondary/30 hover:bg-primary/10 hover:border-primary transition-all text-left group"
              >
                <div className="p-3 rounded-lg bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">
                    {t("sourceCamera")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Qurilma kamerasini yoqish
                  </p>
                </div>
              </button>

              {/* Choice 2: Gallery */}
              <button
                type="button"
                onClick={handleGalleryClick}
                className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-border bg-secondary/30 hover:bg-primary/10 hover:border-primary transition-all text-left group"
              >
                <div className="p-3 rounded-lg bg-amber-500/15 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">
                    {t("sourceGallery")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fayllardan rasm yuklash
                  </p>
                </div>
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsSourceChoiceOpen(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6: Live Camera Modal */}
      {isCameraOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <span>{t("cameraModalTitle")}</span>
              </h3>
              <button
                type="button"
                onClick={closeCameraModal}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {cameraError ? (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-destructive font-medium">
                  {cameraError}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    closeCameraModal();
                    cameraFallbackInputRef.current?.click();
                  }}
                >
                  Mobil kamera orqali ochish
                </Button>
              </div>
            ) : capturedPhoto ? (
              <div className="space-y-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedPhoto}
                    alt="Captured preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetakePhoto}
                    className="flex-1 inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>{t("retake")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleConfirmCapturedPhoto}
                    className="flex-1 inline-flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t("usePhoto")}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black border border-border flex items-center justify-center">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && cameraStream && el.srcObject !== cameraStream) {
                        el.srcObject = cameraStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCameraModal}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSnapPhoto}
                    className="flex-1 inline-flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{t("takePhoto")}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
