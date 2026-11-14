"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Layers, MapPin, CheckCheck, Repeat, BarChart3, Send } from "lucide-react";

export function FeaturesSection() {
  const t = useTranslations("features");

  const featureItems = [
    {
      title: t("f1Title"),
      desc: t("f1Desc"),
      icon: Layers,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: t("f2Title"),
      desc: t("f2Desc"),
      icon: MapPin,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      title: t("f3Title"),
      desc: t("f3Desc"),
      icon: CheckCheck,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: t("f4Title"),
      desc: t("f4Desc"),
      icon: Repeat,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: t("f5Title"),
      desc: t("f5Desc"),
      icon: BarChart3,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: t("f6Title"),
      desc: t("f6Desc"),
      icon: Send,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
  ];

  return (
    <section
      id="features"
      className="py-20 md:py-28 bg-card/15 border-t border-border/50"
    >
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

        {/* 6 Features Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featureItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group rounded-3xl border border-border/70 bg-card/95 p-7 sm:p-8 shadow-sm transition-all duration-200 hover:border-primary/50 hover:bg-card hover:-translate-y-1"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${item.color} mb-5 shadow-sm`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
