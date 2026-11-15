import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import type { UserRole } from "@/lib/storage-auth";

interface SignupPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string }>;
}

const VALID_ROLES = new Set<string>(["company_owner", "dispatcher", "driver"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.signup" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function SignupPage({
  params,
  searchParams,
}: SignupPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("Auth.signup");
  const initialRole: UserRole | null =
    query.role && VALID_ROLES.has(query.role) ? (query.role as UserRole) : null;

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <SignupForm initialRole={initialRole} />
    </AuthShell>
  );
}
