/**
 * SITE CONFIGURATION
 * 
 * IMPORTANT:
 * Working brand name: [BRAND_NAME]. This is a placeholder. The real name is not chosen yet.
 * Keep brand name, tagline, domain, and contact details in THIS FILE so they can be changed
 * in a single place. Never hardcode the brand name inside components or translation strings;
 * reference this config.
 */

export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: {
    uz: string;
    ru: string;
    en: string;
  };
  description: {
    uz: string;
    ru: string;
    en: string;
  };
  domain: string;
  url: string;
  ogImage: string;
  contact: {
    email: string;
    phone: string;
    phoneDisplay: string;
    telegramSupport: string;
    address: string;
  };
  socials: {
    telegramChannel: string;
    telegramBot: string;
    linkedin: string;
  };
  nav: {
    href: string;
    key: "problem" | "howItWorks" | "features" | "faq";
  }[];
  defaultLocale: "uz";
  locales: readonly ["uz", "ru", "en"];
}

export const siteConfig: SiteConfig = {
  // Brand name: TransFlow
  name: "TransFlow",
  shortName: "TransFlow",
  tagline: {
    uz: "O'zbekiston yuk tashuvchilari uchun Telegram-asosidagi zamonaviy logistika boshqaruvi",
    ru: "Telegram-платформа управления логистикой для автопарков Узбекистана",
    en: "Telegram-first logistics management platform for transport fleets in Uzbekistan",
  },
  description: {
    uz: "Qo'ng'iroqlar va tarqoq Telegram-guruhlar tartibsizligiga barham bering. 5 tadan 30 tagacha yuk mashinasiga ega korxonalar uchun dispetcherlik, jonli GPS monitoring, Telegram orqali topshirish dalili va bo'sh qaytishni kamaytirish.",
    ru: "Откажитесь от хаоса звонков и мессенджеров: единая диспетчеризация, GPS-трекинг, фотофиксация доставки через Telegram и попутные грузы для автопарков от 5 до 30 машин.",
    en: "Eliminate the chaos of phone calls and chat groups. Dispatching, live GPS tracking, Telegram proof of delivery, and backhaul matching for fleets with 5 to 30 trucks.",
  },
  domain: "transflow.uz",
  url: "https://transflow.uz",
  ogImage: "/og-image.png",
  contact: {
    email: "",
    phone: "",
    phoneDisplay: "",
    telegramSupport: "",
    address: "",
  },
  socials: {
    telegramChannel: "",
    telegramBot: "",
    linkedin: "",
  },
  nav: [
    { href: "#problem", key: "problem" },
    { href: "#how-it-works", key: "howItWorks" },
    { href: "#features", key: "features" },
    { href: "#faq", key: "faq" },
  ],
  defaultLocale: "uz",
  locales: ["uz", "ru", "en"] as const,
};
