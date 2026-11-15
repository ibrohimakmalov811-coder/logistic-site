"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { AlertTriangle, Database, RefreshCw, UserCheck, Users, X, Zap } from "lucide-react";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { generateStressOrders, seedDemoData, syncChannel } from "@/lib/data";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function DemoBanner() {
  const t = useTranslations("demoBanner");
  const router = useRouter();
  const { currentUser, currentCompany, switchDemoUser, refresh } = useTransFlowAuth();
  const [isWorking, setIsWorking] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [noticeDismissed, setNoticeDismissed] = React.useState(false);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem("transflow_demo_notice_dismissed") === "1") {
        setNoticeDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismissNotice = () => {
    setNoticeDismissed(true);
    try {
      window.localStorage.setItem("transflow_demo_notice_dismissed", "1");
    } catch {}
  };

  const handleSwitch = async (role: "company_owner" | "dispatcher" | "driver") => {
    setIsWorking(true);
    try {
      await switchDemoUser(role);
      const target = role === "driver" ? "/app/driver" : "/app/company";
      router.push(target);
    } finally {
      setIsWorking(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Barcha ma'lumotlarni tozalab, boshlang'ich demo holatiga qaytarishni xohlaysizmi?")) {
      return;
    }
    setIsWorking(true);
    try {
      await seedDemoData();
      syncChannel.broadcast("STORAGE_RESET");
      await refresh();
      setMessage("Demo ma'lumotlar tiklandi!");
      setTimeout(() => setMessage(null), 3000);
      router.push("/app/company");
    } finally {
      setIsWorking(false);
    }
  };

  const handleAddOrders = async () => {
    if (!currentCompany) {
      alert("Avval kompaniya profiliga o'ting.");
      return;
    }
    setIsWorking(true);
    try {
      await generateStressOrders(currentCompany.id, 30);
      syncChannel.broadcast("ORDER_CREATED", { companyId: currentCompany.id });
      await refresh();
      setMessage("30 ta yangi reys muvaffaqiyatli generatsiya qilindi!");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div
      role="complementary"
      aria-label="Demo mode banner"
      className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs px-3 py-1.5 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left Notice */}
        {!noticeDismissed ? (
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{t("demoNotice")}</span>
            <button
              type="button"
              onClick={handleDismissNotice}
              aria-label={t("dismiss")}
              className="ml-1 p-0.5 text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-50 rounded"
            >
              <X className="h-3 w-3" />
            </button>
            {message && (
              <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {message}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-medium">
            {message && (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {message}
              </span>
            )}
          </div>
        )}

        {/* Right Demo Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {currentUser && (
            <span className="hidden lg:inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
              <UserCheck className="h-3 w-3" />
              {currentUser.fullName} ({currentUser.role})
            </span>
          )}

          <div className="inline-flex rounded-lg border border-amber-500/30 bg-background/50 p-0.5">
            <button
              type="button"
              disabled={isWorking}
              onClick={() => handleSwitch("company_owner")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentUser?.role === "company_owner"
                  ? "bg-amber-500 text-white font-semibold"
                  : "hover:bg-amber-500/20 text-muted-foreground"
              }`}
            >
              Egasi
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => handleSwitch("dispatcher")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentUser?.role === "dispatcher"
                  ? "bg-amber-500 text-white font-semibold"
                  : "hover:bg-amber-500/20 text-muted-foreground"
              }`}
            >
              Dispetcher
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => handleSwitch("driver")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentUser?.role === "driver"
                  ? "bg-amber-500 text-white font-semibold"
                  : "hover:bg-amber-500/20 text-muted-foreground"
              }`}
            >
              Haydovchi
            </button>
          </div>

          <button
            type="button"
            disabled={isWorking}
            onClick={handleAddOrders}
            title="Paginatsiya va yuklama sinovi uchun 30 ta buyurtma qo'shish"
            className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium hover:bg-amber-500/20 transition-colors"
          >
            <Zap className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            +30 Buyurtma
          </button>

          <button
            type="button"
            disabled={isWorking}
            onClick={handleReset}
            title="Demo ma'lumotlarni tozalash va boshlang'ich holatga qaytarish"
            className="inline-flex items-center gap-1 rounded border border-destructive/30 bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-medium hover:bg-destructive/20 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isWorking ? "animate-spin" : ""}`} />
            Qayta tiklash
          </button>
        </div>
      </div>
    </div>
  );
}
