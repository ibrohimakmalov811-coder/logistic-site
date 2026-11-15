import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PackageOpen, Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "CompanyPortal.phase2Backhaul",
  });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function CompanyBackhaulComingSoonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("CompanyPortal.phase2Backhaul");

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-card/70 p-8 sm:p-12 text-center max-w-2xl mx-auto mt-6 space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <PackageOpen className="h-7 w-7" />
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
        <Sparkles className="h-3.5 w-3.5" />
        {t("badge")}
      </span>
      <h1 className="text-2xl font-bold font-heading">{t("title")}</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("description")}
      </p>
    </div>
  );
}
