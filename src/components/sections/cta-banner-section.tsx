"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { Sparkles } from "lucide-react";

export function CtaBannerSection() {
  const t = useTranslations("finalCta");

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-card/30 via-card/50 to-background border-t border-border/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-12">
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

        <div className="max-w-2xl mx-auto">
          <WaitlistForm id="final-waitlist-form" />
        </div>
      </div>
    </section>
  );
}
