"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { LanguageSwitcher } from "./language-switcher";
import { Truck, Mail, Phone, MapPin, Send, Linkedin } from "lucide-react";
import { Link } from "@/i18n/routing";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale() as "uz" | "ru" | "en";

  return (
    <footer className="border-t border-border/70 bg-card/90 pt-16 pb-12 text-sm text-muted-foreground">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12 pb-12">
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
              <li>
                <a href="#problem" className="hover:text-foreground transition-colors">
                  {locale === "uz" ? "Muammo" : locale === "ru" ? "Проблема" : "Problem"}
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-foreground transition-colors"
                >
                  {locale === "uz"
                    ? "Qanday ishlaydi"
                    : locale === "ru"
                      ? "Как работает"
                      : "How It Works"}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  {locale === "uz"
                    ? "Imkoniyatlar"
                    : locale === "ru"
                      ? "Возможности"
                      : "Features"}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  {locale === "uz" ? "Savollar" : locale === "ru" ? "Вопросы" : "FAQ"}
                </a>
              </li>
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

          {/* Contact Placeholders */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {t("contactTitle")}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="hover:text-foreground transition-colors"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a
                  href={`tel:${siteConfig.contact.phone}`}
                  className="hover:text-foreground transition-colors"
                >
                  {siteConfig.contact.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{siteConfig.contact.address}</span>
              </li>
            </ul>

            {/* Socials placeholder */}
            <div className="pt-2 flex items-center gap-3">
              <a
                href={siteConfig.socials.telegramChannel}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram Channel"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={siteConfig.socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Linkedin className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
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
