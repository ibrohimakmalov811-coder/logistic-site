"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { Sparkles, Clock, CheckCircle2, Sliders, Shield } from "lucide-react";

export function EarlyAccessTeaserSection() {
  const t = useTranslations("earlyAccess");

  const benefits = [
    {
      title: t("b1Title"),
      desc: t("b1Desc"),
      icon: Clock,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      title: t("b2Title"),
      desc: t("b2Desc"),
      icon: CheckCircle2,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: t("b3Title"),
      desc: t("b3Desc"),
      icon: Sliders,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <section id="waitlist" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="amber" className="mb-4">
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

        {/* Benefits Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border/70 bg-card/95 p-6"
              >
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${b.color} mb-4`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {b.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Reassurance text */}
        <div className="mt-6 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            {t("noCommitment")}
          </p>
        </div>

        {/* Form Container */}
        <div className="mt-12 max-w-2xl mx-auto">
          <WaitlistForm id="early-access-form" />
        </div>
      </div>
    </section>
  );
}
