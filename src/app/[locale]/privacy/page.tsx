import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Link, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("title"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("privacy");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t("backHome")}</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card/80 p-8 sm:p-12 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3 text-primary mb-4">
            <ShieldCheck className="h-8 w-8" aria-hidden="true" />
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
              {t("title")}
            </h1>
          </div>

          <p className="text-xs font-mono text-muted-foreground mb-6">
            {t("lastUpdated")}
          </p>

          <div className="mb-8 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            {t("legalReviewNotice")}
          </div>

          <div className="space-y-6 text-sm sm:text-base text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium">
              {t("intro", { brand: siteConfig.name })}
            </p>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {t("dataCollectedTitle")}
              </h2>
              <p>{t("dataCollectedText")}</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {t("portalAccountsTitle")}
              </h2>
              <p>{t("portalAccountsText")}</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {t("proofPhotosTitle")}
              </h2>
              <p>{t("proofPhotosText")}</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {t("futureGpsTitle")}
              </h2>
              <p>{t("futureGpsText")}</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {t("purposeTitle")}
              </h2>
              <p>{t("purposeText")}</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {t("retentionTitle")}
              </h2>
              <p>{t("retentionText")}</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {t("rightsTitle")}
              </h2>
              <p>
                {t("rightsText", {
                  contact: siteConfig.contact.email || t("contactPending"),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
