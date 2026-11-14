"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  MapPin,
  BarChart3,
  Sparkles,
  Clock,
  Truck,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductPreviewSection() {
  const t = useTranslations("productPreview");
  const locale = useLocale() as "uz" | "ru" | "en";
  const [activeTab, setActiveTab] = React.useState<"dispatch" | "tracking" | "reports">(
    "dispatch"
  );

  return (
    <section className="py-20 md:py-28 bg-card/25 border-t border-border/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="default" className="mb-4">
            <Sparkles className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            {t("badge")}
          </Badge>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("dispatch")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                activeTab === "dispatch"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              <span>{t("tabDispatch")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tracking")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                activeTab === "tracking"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{t("tabTracking")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                activeTab === "reports"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span>{t("tabReports")}</span>
            </button>
          </div>
        </div>

        {/* Screen Showcase Wrapper */}
        <div className="mt-8 mx-auto max-w-5xl rounded-3xl border border-border/80 bg-card/95 p-4 sm:p-7 shadow-2xl">
          {/* Header Bar with concept label */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {siteConfig.name.toLowerCase()}.app/preview/{activeTab}
              </span>
            </div>

            <span className="rounded-full bg-amber-500/15 px-3 py-0.5 text-[11px] font-bold text-amber-500 border border-amber-500/30">
              {t("illustrativeTag")}
            </span>
          </div>

          {/* TAB 1: DISPATCH BOARD */}
          {activeTab === "dispatch" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {locale === "uz"
                      ? "Kunlik reyslar jadvali"
                      : locale === "ru"
                        ? "Суточный график рейсов"
                        : "Daily Dispatch Board"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {locale === "uz"
                      ? "Jami 8 ta faol marshrut nazoratda"
                      : locale === "ru"
                        ? "Всего 8 активных маршрутов"
                        : "8 active routes tracked"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {"6 mashina yo'lda"}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    2 ta kutishda
                  </span>
                </div>
              </div>

              {/* Mockup Table */}
              <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background/50">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-border/60 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">ID / Mashina</th>
                      <th className="px-4 py-3">Marshrut</th>
                      <th className="px-4 py-3">Haydovchi</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    <tr className="hover:bg-card/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-foreground">
                          01 789 AFA
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          Isuzu 5t
                        </span>
                      </td>
                      <td className="px-4 py-3">Toshkent → Samarqand</td>
                      <td className="px-4 py-3">Alisher Qodirov</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          Harakatda
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">14:30</td>
                    </tr>
                    <tr className="hover:bg-card/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-foreground">
                          10 456 BBA
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          MAN 20t
                        </span>
                      </td>
                      <td className="px-4 py-3">Toshkent → Andijon</td>
                      <td className="px-4 py-3">Jamshid Boboyev</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Yuk tushirmoqda
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">Yetib bordi</td>
                    </tr>
                    <tr className="hover:bg-card/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-foreground">
                          80 112 CAA
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          Isuzu 7t
                        </span>
                      </td>
                      <td className="px-4 py-3">Buxoro → Qarshi</td>
                      <td className="px-4 py-3">Farhod Mahmudov</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Topshirildi (PoD)
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">11:45</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE GPS MAP */}
          {activeTab === "tracking" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {locale === "uz"
                      ? "Jonli telematika xaritasi"
                      : locale === "ru"
                        ? "Телематическая карта"
                        : "Live Telematics Map"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {locale === "uz"
                      ? "GPS trekerlar va Telegram orqali uzatilayotgan nuqtalar"
                      : locale === "ru"
                        ? "Координаты с GPS-трекеров и Telegram"
                        : "GPS tracker feeds and coordinates"}
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                  100% Onlayn
                </span>
              </div>

              <div className="relative rounded-2xl border border-border/70 bg-background/80 p-6 min-h-[300px] overflow-hidden flex flex-col justify-between">
                {/* SVG Visual map of corridor */}
                <svg
                  className="absolute inset-0 h-full w-full opacity-50"
                  viewBox="0 0 700 350"
                  fill="none"
                >
                  <path
                    d="M 100 250 Q 300 180 500 120 T 650 90"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                  />
                  <circle cx="500" cy="120" r="7" fill="#3b82f6" />
                  <circle cx="500" cy="120" r="14" fill="#3b82f6" opacity="0.22" />
                  <circle cx="200" cy="210" r="6" fill="#10b981" />
                  <circle cx="650" cy="90" r="8" fill="#f59e0b" />
                </svg>

                {/* Floating telemetry widget */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Hozirgi tezlik
                    </span>
                    <p className="text-lg font-mono font-bold text-foreground">
                      78 km/soat
                    </p>
                    <span className="text-[10px] text-emerald-400">
                      {"Tezlik me'yorida"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      {"To'xtash vaqti"}
                    </span>
                    <p className="text-lg font-mono font-bold text-foreground">
                      0 daqiqa
                    </p>
                    <span className="text-[10px] text-primary">
                      {"To'xtovsiz harakat"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Samarqandgacha masofa
                    </span>
                    <p className="text-lg font-mono font-bold text-foreground">114 km</p>
                    <span className="text-[10px] text-amber-400">
                      Kutilayotgan ETA: 14:30
                    </span>
                  </div>
                </div>

                <div className="relative z-10 mt-6 rounded-xl border border-border/80 bg-card/90 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">01 789 AFA</span>
                    <span className="text-muted-foreground">— Alisher Q. (Isuzu 5t)</span>
                  </div>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    Oxirgi ping: 12 soniya oldin
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REPORTS & ANALYTICS */}
          {activeTab === "reports" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {locale === "uz"
                      ? "Reyslar va haydovchilar unumdorligi"
                      : locale === "ru"
                        ? "Отчетность и продуктивность"
                        : "Fleet Performance & Cost Metrics"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {locale === "uz"
                      ? "Avtomatik hisoblangan ko'rsatkichlar namunalari"
                      : locale === "ru"
                        ? "Автоматический расчет ключевых метрик"
                        : "Automated performance benchmarks"}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  Haftalik hisobot
                </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <span className="text-xs font-medium text-muted-foreground">
                    {"O'z vaqtida yetkazish intizomi"}
                  </span>
                  <div className="mt-2 text-2xl font-bold font-heading text-emerald-400">
                    94.2%
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Hafta davomida +3.4% yaxshilanish maqsadi
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <span className="text-xs font-medium text-muted-foreground">
                    Telegram PoD qamrovi
                  </span>
                  <div className="mt-2 text-2xl font-bold font-heading text-primary">
                    98.0%
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Barcha yuk xatlari foto-dalil bilan yopildi
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <span className="text-xs font-medium text-muted-foreground">
                    {"O'rtacha reys vaqti"}
                  </span>
                  <div className="mt-2 text-2xl font-bold font-heading text-amber-400">
                    4 soat 20 daq
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {"Kechikishlar sabablari bo'yicha tahlil"}
                  </p>
                </div>
              </div>

              {/* Delay distribution illustration */}
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Kechikish sabablari taqsimoti (Namunaviy diagramma)
                </h5>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Yuklash/Tushirish navbati omborda</span>
                      <span className="font-mono">55%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: "55%" }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>{"Yo'ldagi tirbandliklar (Shaharga kirish)"}</span>
                      <span className="font-mono">30%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: "30%" }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Boshqa sabablar</span>
                      <span className="font-mono">15%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-slate-500 rounded-full"
                        style={{ width: "15%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
