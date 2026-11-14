"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Truck, UserCheck, Store, AlertCircle, Sparkles } from "lucide-react";

export function WhoIsItForSection() {
  const t = useTranslations("whoIsItFor");

  const personas = [
    {
      title: t("c1Title"),
      fleet: t("c1Fleet"),
      pain: t("c1Pain"),
      benefit: t("c1Benefit"),
      icon: Truck,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/25",
    },
    {
      title: t("c2Title"),
      fleet: t("c2Fleet"),
      pain: t("c2Pain"),
      benefit: t("c2Benefit"),
      icon: UserCheck,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
    },
    {
      title: t("c3Title"),
      fleet: t("c3Fleet"),
      pain: t("c3Pain"),
      benefit: t("c3Benefit"),
      icon: Store,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-card/10 border-t border-border/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="default" className="mb-4">
            <Users className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            {t("badge")}
          </Badge>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* 3 Personas Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {personas.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card
                key={idx}
                className="flex flex-col justify-between border-border/70 hover:border-primary/40 hover:-translate-y-1 transition-all"
              >
                <div>
                  <CardHeader className="pb-4">
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} ${item.color} mb-3`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <span className="text-xs font-semibold text-primary inline-block mt-1">
                      {item.fleet}
                    </span>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    {/* Pain point */}
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("painLabel")}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {item.pain}
                      </p>
                    </div>

                    {/* Benefit */}
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("benefitLabel")}
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                        {item.benefit}
                      </p>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
