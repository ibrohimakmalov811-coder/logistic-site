import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { PersonalInfoView } from "@/components/cabinet/personal-info-view";

interface PersonalInfoPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PersonalInfo" });
  return {
    title: `${t("pageTitle")} | ${siteConfig.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function PersonalInfoPage({ params }: PersonalInfoPageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <PersonalInfoView />;
}
