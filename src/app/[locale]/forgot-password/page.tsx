import { headers } from "next/headers";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { env } from "@/env";
import { siteConfig } from "@/config/site";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Auth.forgotPassword",
  });
  return {
    title: `${t("pageTitle")} | ${siteConfig.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const hdrs = await headers();
  const nonce = hdrs.get("x-nonce") ?? undefined;
  const t = await getTranslations("Auth.forgotPassword");

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <ForgotPasswordForm
        turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        nonce={nonce}
      />
    </AuthShell>
  );
}
