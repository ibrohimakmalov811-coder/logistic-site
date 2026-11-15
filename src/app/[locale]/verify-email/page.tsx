import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { isDevSandboxActive } from "@/lib/supabase/config";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";

interface VerifyEmailPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.verifyEmail" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: VerifyEmailPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("Auth.verifyEmail");

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      isDevSandbox={isDevSandboxActive()}
    >
      <VerifyEmailCard
        email={query.email}
        isDevSandbox={isDevSandboxActive()}
      />
    </AuthShell>
  );
}
