"use client";

import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("nav");

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t("skipToContent")}
    </a>
  );
}
