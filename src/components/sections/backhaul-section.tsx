"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Repeat, ArrowRight, ArrowLeft, Package, Ban, CheckCircle2 } from "lucide-react";

export function BackhaulSection() {
  const t = useTranslations("backhaul");

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-card/10 via-card/30 to-background border-t border-border/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="amber" className="mb-4">
            <Repeat className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            {t("badge")}
          </Badge>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Dedicated Visual Diagram Card */}
        <div className="mt-14 mx-auto max-w-5xl rounded-3xl border border-border/80 bg-card/95 p-6 sm:p-10 shadow-xl">
          {/* Top mandatory illustrative notice */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-8">
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-amber-500 uppercase">
              {t("diagramRoute")}
            </span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-500 border border-amber-500/25">
              {t("illustrativeLabel")}
            </span>
          </div>

          {/* Outbound Leg: Loaded Trip */}
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>{t("outboundTitle")}</span>
                    <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {t("outboundDesc")}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                100% Yuklangan
              </span>
            </div>
          </div>

          {/* Return Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traditional Empty Deadhead Return */}
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-wide">
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    {"An'anaviy holat"}
                  </span>
                  <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    {"Bo'sh kuzov (0%)"}
                  </span>
                </div>
                <h4 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{t("emptyReturnTitle")}</span>
                  <ArrowLeft className="h-4 w-4 text-rose-500" aria-hidden="true" />
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {t("emptyReturnDesc")}
                </p>
              </div>

              <div className="mt-6 border-t border-rose-500/20 pt-3 text-[11px] text-rose-500/90 font-medium">
                {"Yoqilg'i va amortizatsiya sarfi daromadsiz qoladi"}
              </div>
            </div>

            {/* Optimized Matched Return with Platform */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Tizimli maqsad
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Qaytish yuki bilan
                  </span>
                </div>
                <h4 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{t("matchedReturnTitle", { brand: siteConfig.name })}</span>
                  <ArrowLeft className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                  {t("matchedReturnDesc")}
                </p>
              </div>

              <div className="mt-6 border-t border-emerald-500/20 pt-3 text-[11px] text-emerald-400 font-medium">
                {"Bo'sh yurish kilometrlarini keskin kamaytirish maqsadi"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
