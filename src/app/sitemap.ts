import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;
  const locales = routing.locales;

  const routes = ["", "/privacy", "/terms"];
  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of locales) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "daily" : "monthly",
        priority: route === "" ? 1.0 : 0.4,
        alternates: {
          languages: {
            uz: `${baseUrl}/uz${route}`,
            ru: `${baseUrl}/ru${route}`,
            en: `${baseUrl}/en${route}`,
          },
        },
      });
    }
  }

  return sitemapEntries;
}
