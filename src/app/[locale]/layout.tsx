import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { ChromeSwitcher } from "@/components/layout/chrome-switcher";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PwaRegister } from "@/components/common/pwa-register";
import { TransFlowAuthProvider } from "@/lib/data/client-auth-context";
import "../globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext", "cyrillic-ext"],
  variable: "--font-heading",
  display: "swap",
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = (
    routing.locales.includes(locale as Locale) ? locale : routing.defaultLocale
  ) as Locale;

  const title = `${siteConfig.name} — ${siteConfig.tagline[currentLocale] || siteConfig.tagline.uz}`;
  const description = siteConfig.description[currentLocale] || siteConfig.description.uz;
  const baseUrl = siteConfig.url;

  return {
    title: {
      default: title,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/${currentLocale}`,
      languages: {
        uz: `${baseUrl}/uz`,
        ru: `${baseUrl}/ru`,
        en: `${baseUrl}/en`,
        "x-default": `${baseUrl}/uz`,
      },
    },
    openGraph: {
      type: "website",
      locale: currentLocale,
      url: `${baseUrl}/${currentLocale}`,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} Logistics Platform`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/icon.svg",
      apple: "/icon.svg",
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // JSON-LD Structured Data for Organization & WebSite
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description.en,
        ...(siteConfig.contact.phone
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                telephone: siteConfig.contact.phone,
                contactType: "customer service",
                areaServed: "UZ",
                availableLanguage: ["uz", "ru", "en"],
              },
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        publisher: {
          "@id": `${siteConfig.url}/#organization`,
        },
        inLanguage: ["uz", "ru", "en"],
      },
    ],
  };

  return (
    <html lang={locale} suppressHydrationWarning className="dark">
      <head>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem nonce={nonce}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <PwaRegister />
            <TransFlowAuthProvider>
              <AuthGuard>
                <ChromeSwitcher>{children}</ChromeSwitcher>
              </AuthGuard>
            </TransFlowAuthProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
