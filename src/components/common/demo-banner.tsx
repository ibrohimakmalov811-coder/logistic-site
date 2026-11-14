"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { AlertTriangle, Database, RefreshCw, UserCheck, Users, Zap } from "lucide-react";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { generateStressOrders, seedDemoData, syncChannel } from "@/lib/data";
import { useRouter } from "@/i18n/routing";

export function DemoBanner() {
  const locale = useLocale();
  const router = useRouter();
  const { currentUser, currentCompany, switchDemoUser, refresh } = useTransFlowAuth();
  const [isWorking, setIsWorking] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const bannerText = {
    uz: "Demo rejimi: Ma'lumotlar faqat ushbu brauzerda saqlanadi. Haqiqiy shaxsiy ma'lumotlarni kiritmang.",
    ru: "Демо режим: Данные сохраняются только в этом браузере. Не вводите реальные данные.",
    en: "Demo mode: Data is stored only in this browser. Do not enter real personal data.",
  }[locale as "uz" | "ru" | "en"] || "Demo mode: Local browser storage only.";

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
        <div className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{bannerText}</span>
          {message && (
            <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {message}
            </span>
          )}
        </div>

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
