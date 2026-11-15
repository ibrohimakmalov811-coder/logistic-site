import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { CabinetView } from "@/components/cabinet/cabinet-view";

interface CabinetPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cabinet" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function CabinetPage({ params }: CabinetPageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <CabinetView />;
}
