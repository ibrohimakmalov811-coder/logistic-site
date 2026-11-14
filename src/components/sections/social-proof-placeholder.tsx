"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, Building2, ArrowRight } from "lucide-react";

export function SocialProofPlaceholder() {
  const t = useTranslations("socialProofPlaceholder");

  return (
    <section className="py-16 md:py-20 bg-card/10 border-t border-border/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-dashed border-border/80 bg-card/85 p-8 sm:p-12 text-center">
          {/* Integrity badge */}
          <div className="inline-flex items-center gap-1.5 mb-4">
            <Badge variant="outline" className="text-xs font-semibold">
              <ShieldCheck
                className="h-3.5 w-3.5 mr-1 text-emerald-400"
                aria-hidden="true"
              />
              {t("badge")}
            </Badge>
          </div>

          <h3 className="font-heading text-xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h3>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t("subtitle")}
          </p>

          {/* Clearly marked placeholder slots for future partners */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((slot) => (
              <div
                key={slot}
                className="flex h-16 w-36 sm:w-44 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/60 px-4 text-xs font-mono text-muted-foreground/60 select-none"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 opacity-40" aria-hidden="true" />
                  <span>{t("partnerSlot", { slot })}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {t("tag")}
            </span>
            <p className="text-xs text-muted-foreground">{t("pilotInvitation")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
