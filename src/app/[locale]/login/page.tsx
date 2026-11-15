import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; registered?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.login" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("Auth.login");

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <LoginForm registered={query.registered === "1"} />
    </AuthShell>
  );
}
