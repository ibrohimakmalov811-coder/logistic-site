"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroMockup } from "./hero-mockup";
import { RouteLinesBackground } from "@/components/common/route-lines-bg";
import { Sparkles, ArrowRight, PlayCircle } from "lucide-react";

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Background Animated Route Lines */}
      <RouteLinesBackground />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Text Content */}
        <div className="mx-auto max-w-3xl text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 mb-6">
            <Badge
              variant="amber"
              className="px-3.5 py-1 text-xs sm:text-sm font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {t("badge")}
            </Badge>
          </div>

          {/* Headline */}
          <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            {t("titlePrefix")}{" "}
            <span className="bg-gradient-to-r from-primary via-blue-400 to-amber-400 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>

          {/* Fleet segment note */}
          <p className="mt-2 text-xs sm:text-sm font-medium text-primary/90">
            {t("fleetTarget")}
          </p>

          {/* Dual CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#waitlist" className="w-full sm:w-auto">
              <Button
                variant="amber"
                size="lg"
                className="w-full sm:w-auto font-bold text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <span>{t("ctaPrimary")}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </a>

            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-medium text-base flex items-center justify-center gap-2 bg-card/90"
              >
                <PlayCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{t("ctaSecondary")}</span>
              </Button>
            </a>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-foreground/80 hover:text-primary hover:underline transition-colors"
            >
              {t("demoCabinet")} →
            </Link>
          </div>
        </div>

        {/* Animated Product Mockup Preview */}
        <div className="mt-14 sm:mt-16">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
