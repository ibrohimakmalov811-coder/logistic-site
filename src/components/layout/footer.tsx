"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { Truck, Mail, Phone, MapPin, Send, Linkedin } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const locale = useLocale() as "uz" | "ru" | "en";
  const pathname = usePathname();
  const isHome = pathname === "/";

  const hasEmail = Boolean(siteConfig.contact.email);
  const hasPhone = Boolean(siteConfig.contact.phone || siteConfig.contact.phoneDisplay);
  const hasAddress = Boolean(siteConfig.contact.address);
  const telegramUrl = siteConfig.socials.telegramChannel || siteConfig.contact.telegramSupport;
  const linkedinUrl = siteConfig.socials.linkedin;
  const hasAnySocial = Boolean(telegramUrl || linkedinUrl);
  const hasAnyContact = hasEmail || hasPhone || hasAddress || hasAnySocial;

  const navSectionLinks = [
    { hash: "problem", label: tNav("problem") },
    { hash: "how-it-works", label: tNav("howItWorks") },
    { hash: "features", label: tNav("features") },
    { hash: "faq", label: tNav("faq") },
  ];

  return (
    <footer className="border-t border-border/70 bg-card/90 pt-16 pb-12 text-sm text-muted-foreground">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "grid grid-cols-1 gap-10 lg:gap-12 pb-12",
            hasAnyContact ? "md:grid-cols-4" : "md:grid-cols-3"
          )}
        >
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5 font-heading text-lg font-bold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </div>
              <span>{siteConfig.name}</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description[locale] || siteConfig.description.uz}
            </p>
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {t("navigationTitle")}
            </h4>
            <ul className="space-y-2 text-sm">
              {navSectionLinks.map((item) => (
                <li key={item.hash}>
                  {isHome ? (
                    <a
                      href={`#${item.hash}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={{ pathname: "/", hash: item.hash }}
                      className="hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Pages */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {t("legalTitle")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  {t("terms")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details (Rendered strictly only if configured) */}
          {hasAnyContact && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("contactTitle")}
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                {hasEmail && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a
                      href={`mailto:${siteConfig.contact.email}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {siteConfig.contact.email}
                    </a>
                  </li>
                )}
                {hasPhone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a
                      href={`tel:${siteConfig.contact.phone || siteConfig.contact.phoneDisplay}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {siteConfig.contact.phoneDisplay || siteConfig.contact.phone}
                    </a>
                  </li>
                )}
                {hasAddress && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{siteConfig.contact.address}</span>
                  </li>
                )}
              </ul>

              {/* Social Icon Links with Localized Aria Labels */}
              {hasAnySocial && (
                <div className="pt-2 flex items-center gap-3">
                  {telegramUrl && (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Telegram"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar with copyright & concept disclaimer */}
        <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. {t("rights")}
          </p>
          <p className="text-[11px] text-muted-foreground/80 italic text-center sm:text-right">
            {t("conceptDisclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
