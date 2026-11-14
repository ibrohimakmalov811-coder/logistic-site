"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { marketStats, macroTradeContext } from "@/data/stats";
import { CountUp } from "@/components/common/count-up";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  TrendingUp,
} from "lucide-react";

export function ProblemSection() {
  const t = useTranslations("problem");
  const locale = useLocale() as "uz" | "ru" | "en";

  return (
    <section id="problem" className="py-20 md:py-28 bg-card/20 border-y border-border/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="amber" className="mb-4">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            {t("badge")}
          </Badge>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Macro Trade Context Banner */}
        <div className="mt-8 mx-auto max-w-4xl rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <TrendingUp className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-2 mb-1 justify-center sm:justify-start">
              <span className="font-mono font-bold text-sm sm:text-base text-primary">
                {locale === "ru" ? "$50 млрд → $81,2 млрд (2022 → 2025)" : locale === "uz" ? "$50 mlrd → $81.2 mlrd (2022 → 2025)" : "$50B → $81.2B (2022 → 2025)"}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5">
                {t("macroGrowthNote")}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
              {macroTradeContext.exactWording[locale] ||
                macroTradeContext.exactWording.uz}
            </p>
            <div className="mt-1 flex items-center justify-center sm:justify-start gap-1 text-[11px] text-muted-foreground">
              <span>{t("sourcePrefix")}</span>
              <a
                href={macroTradeContext.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                {macroTradeContext.sourceName}
                <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* Verified Market Statistics Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {marketStats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-3xl border border-border/80 bg-card/95 p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1"
            >
              <div>
                {/* Big Metric Display */}
                <div className="flex items-baseline gap-1 text-4xl sm:text-5xl font-extrabold text-primary font-heading">
                  {stat.numericValue ? (
                    <>
                      <CountUp end={stat.numericValue} />
                      <span className="text-2xl sm:text-3xl font-bold">%</span>
                    </>
                  ) : (
                    <span className="text-3xl sm:text-4xl">
                      {t("statMany")}
                    </span>
                  )}
                </div>

                {/* Exact Verified Wording */}
                <p className="mt-4 text-sm sm:text-base text-foreground font-medium leading-relaxed">
                  {stat.exactWording[locale] || stat.exactWording.uz}
                </p>

                {/* Context Note (e.g. online retailers qualification) */}
                {stat.contextNote && (
                  <p className="mt-2 text-xs text-amber-500/90 font-medium italic">
                    {stat.contextNote[locale] || stat.contextNote.uz}
                  </p>
                )}
              </div>

              {/* Source Link */}
              <div className="mt-6 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span className="block text-[10px] uppercase font-bold text-muted-foreground/80 mb-0.5">
                  {t("researchSource")}
                </span>
                <a
                  href={stat.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary/90 hover:text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  {stat.sourceName}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Before / After Comparison */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h3 className="font-heading text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t("beforeAfterTitle")}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Before: Messenger Chaos */}
            <Card className="border-rose-500/25 bg-rose-500/5 p-6 sm:p-8">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <XCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <CardTitle className="text-rose-500 text-lg sm:text-xl">
                    {t("beforeTitle")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {[t("before1"), t("before2"), t("before3"), t("before4")].map(
                  (point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-sm sm:text-base text-muted-foreground"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                      <span>{point}</span>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* After: Unified System with [BRAND_NAME] */}
            <Card className="border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <CardTitle className="text-emerald-400 text-lg sm:text-xl">
                    {t("afterTitle", { brand: siteConfig.name })}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {[t("after1"), t("after2"), t("after3"), t("after4")].map(
                  (point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-sm sm:text-base text-foreground font-medium"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <span>{point}</span>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
