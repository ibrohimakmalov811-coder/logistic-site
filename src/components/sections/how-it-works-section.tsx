"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Navigation, CheckCircle2, ArrowRight } from "lucide-react";

export function HowItWorksSection() {
  const t = useTranslations("howItWorks");

  const steps = [
    {
      number: t("step1Number"),
      title: t("step1Title"),
      desc: t("step1Desc"),
      icon: ClipboardList,
      accent: "from-blue-500 to-primary",
    },
    {
      number: t("step2Number"),
      title: t("step2Title"),
      desc: t("step2Desc"),
      icon: Navigation,
      accent: "from-primary to-amber-500",
      isComingSoon: true,
    },
    {
      number: t("step3Number"),
      title: t("step3Title"),
      desc: t("step3Desc"),
      icon: CheckCircle2,
      accent: "from-amber-500 to-emerald-500",
      isComingSoon: true,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="default" className="mb-4">
            {t("badge")}
          </Badge>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* 3 Steps with Connecting Line */}
        <div className="mt-16 sm:mt-20 relative">
          {/* Animated Connecting Line (Hidden on mobile, visible on lg screens) */}
          <div
            className="hidden lg:block absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 h-1 -z-0"
            aria-hidden="true"
          >
            <div className="h-full w-full bg-gradient-to-r from-primary via-amber-500 to-emerald-500 opacity-40 rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-border/70 bg-card/95 p-8 shadow-sm flex flex-col justify-between transition-all hover:border-primary/40 hover:-translate-y-1"
                >
                  <div>
                    {/* Step Number & Icon Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-primary-foreground shadow-lg shadow-primary/20 bg-primary">
                        <Icon className="h-7 w-7" aria-hidden="true" />
                      </div>
                      <div className="flex items-center gap-2">
                        {step.isComingSoon && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            {t("comingSoonBadge")}
                          </span>
                        )}
                        <span className="font-mono text-3xl font-black text-muted-foreground/30">
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Step Title & Description */}
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {idx < 2 && (
                    <div className="lg:hidden mt-6 flex justify-center text-muted-foreground">
                      <ArrowRight className="h-5 w-5 rotate-90" aria-hidden="true" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
