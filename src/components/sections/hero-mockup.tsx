"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { Truck, MapPin, CheckCircle, Clock, ShieldCheck, Radio } from "lucide-react";
import { MOCK_VEHICLES, MOCK_CORRIDORS, getMockRoute } from "@/data/mock";

export function HeroMockup() {
  const t = useTranslations("hero");
  const locale = useLocale() as "uz" | "ru" | "en";

  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-3xl border border-border/80 bg-card/95 p-3 sm:p-5 shadow-2xl">
      {/* Top concept badge and browser-style window header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 px-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">
            {siteConfig.name.toLowerCase()}.app/dispatch
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500 border border-amber-500/20">
            <Radio className="h-3 w-3" aria-hidden="true" />
            {t("conceptLabel")}
          </span>
        </div>
      </div>

      {/* Main mockup grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4">
        {/* Left Column: Concept Vehicle List */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("activeTripsCount")}
            </span>
            <span className="text-[11px] text-amber-500/90 font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500/80 inline-block" />
              {t("conceptStream")}
            </span>
          </div>

          {MOCK_VEHICLES.map((v) => (
            <div
              key={v.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-3.5 transition-all hover:border-primary/50 hover:bg-background/90"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Truck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      {v.plate}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        ({v.model})
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground">{v.driverShortName[locale] || v.driverShortName.uz}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    v.status === "delivered"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : v.status === "unloading"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-primary/10 text-primary border-primary/30"
                  }`}
                >
                  {v.statusText[locale] || v.statusText.uz}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
                  {getMockRoute(v, locale)}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  ETA: {v.eta[locale] || v.eta.uz}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Stylized Live GPS Transit Map */}
        <div className="lg:col-span-7 rounded-2xl border border-border/60 bg-background/50 p-4 relative overflow-hidden min-h-[260px] flex flex-col justify-between">
          {/* Map background grid & paths */}
          <svg
            className="absolute inset-0 h-full w-full opacity-60 pointer-events-none"
            viewBox="0 0 600 350"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Grid mesh */}
            <pattern id="mockupGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-border/40"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#mockupGrid)" />

            {/* Route path Tashkent - Samarkand */}
            <path
              d="M 450 90 L 320 180 L 190 230"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="6 6"
            />
            {/* Outbound path Tashkent - Andijan */}
            <path d="M 450 90 L 530 110" stroke="#f59e0b" strokeWidth="2.5" />

            {/* Hub Nodes */}
            {/* Tashkent */}
            <circle cx="450" cy="90" r="7" fill="#3b82f6" />
            <circle cx="450" cy="90" r="14" fill="#3b82f6" opacity="0.22" />
            {/* Samarkand */}
            <circle cx="320" cy="180" r="6" fill="#10b981" />
            {/* Bukhara */}
            <circle cx="190" cy="230" r="5" fill="#3b82f6" opacity="0.8" />
            {/* Andijan */}
            <circle cx="530" cy="110" r="5" fill="#f59e0b" />
          </svg>

          {/* Interactive Floating Status Overlays */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="rounded-xl bg-card/95 border border-border/80 px-3 py-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500/80 inline-block" />
                {t("mockRouteStatus")}
              </span>
            </div>

            <div className="rounded-xl bg-card/95 border border-border/80 px-3 py-1.5 shadow-md text-right">
              <span className="text-[11px] font-mono font-bold text-primary">
                {MOCK_CORRIDORS.m39_jizzakh[locale] || MOCK_CORRIDORS.m39_jizzakh.uz}
              </span>
            </div>
          </div>

          {/* Bottom Card Inside Map: Telegram PoD Simulation */}
          <div className="relative z-10 mt-auto rounded-xl border border-border/70 bg-card/95 p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {t("waybillDeliveredTitle")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("waybillDeliveredDesc")}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                {t("podConceptBadge")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
