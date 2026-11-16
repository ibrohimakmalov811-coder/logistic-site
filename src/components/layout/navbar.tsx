"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { BrandLogo } from "./brand-logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Navigation,
  Layers,
  HelpCircle,
  AlertTriangle,
  LogIn,
  LayoutDashboard,
} from "lucide-react";
import { getCurrentSession } from "@/lib/storage-auth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    setIsLoggedIn(Boolean(getCurrentSession()));
    const onStorage = () => setIsLoggedIn(Boolean(getCurrentSession()));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Track scroll threshold with rAF (no synchronous layout reads)
  React.useEffect(() => {
    let rafId = 0;
    const updateScrolled = () => {
      rafId = 0;
      const next = window.scrollY > 20;
      setIsScrolled((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateScrolled);
      }
    };
    updateScrolled();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Track active landing section via IntersectionObserver (zero scroll reflow)
  React.useEffect(() => {
    if (!isHome) {
      setActiveSection("");
      return;
    }

    const sectionIds = ["problem", "how-it-works", "features", "faq"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome]);

  // Close mobile drawer on Escape key or when resizing into desktop layout
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Prevent background scroll when mobile menu is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navIconMap = {
    problem: AlertTriangle,
    howItWorks: Navigation,
    features: Layers,
    faq: HelpCircle,
  } as const;

  const navLinks = siteConfig.nav.map((item) => ({
    href: item.href,
    hash: item.href.slice(1),
    label: t(item.key),
    icon: navIconMap[item.key],
  }));

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    setActiveSection(href);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-200",
        isScrolled
          ? "border-b border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-sm shadow-md shadow-slate-900/5 dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
          : "border-b border-[#E2E8F0]/60 dark:border-[rgba(255,255,255,0.06)] bg-white/92 dark:bg-[#0B1220]/92"
      )}
    >
      <div className="container mx-auto flex h-16 sm:h-[72px] lg:h-20 max-w-7xl items-center justify-between gap-2 sm:gap-3 px-4 sm:px-6 lg:px-6 xl:px-8">
        {/* ========================================================= */}
        {/* LEFT: Custom Semi-Truck Logo & TransFlow Brand Wordmark   */}
        {/* ========================================================= */}
        <div className="flex items-center shrink-0 min-w-0">
          <Link
            href="/"
            onClick={(e) => {
              setIsMobileMenuOpen(false);
              if (isHome) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] dark:focus-visible:ring-[#3B82F6] rounded-2xl p-1 -m-1"
            aria-label={`${siteConfig.name} Home`}
          >
            <BrandLogo size="md" />
          </Link>
        </div>

        {/* ========================================================= */}
        {/* CENTER: Primary Navigation Links (Desktop lg: 1024px+)    */}
        {/* ========================================================= */}
        <nav
          className="hidden lg:flex items-center gap-0 xl:gap-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] bg-[#F8FAFC] dark:bg-[#111C30] px-1.5 xl:px-3 py-1.5 shadow-sm shadow-blue-500/5 transition-colors duration-200 shrink-0"
          aria-label="Primary navigation"
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.href;
            const linkClass = cn(
              "group relative rounded-xl px-2 xl:px-3.5 py-2 text-[12.5px] xl:text-sm font-semibold whitespace-nowrap transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] dark:focus-visible:ring-[#3B82F6]",
              isActive
                ? "text-[#2563EB] dark:text-[#60A5FA]"
                : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
            );

            const content = (
              <>
                <span className="relative z-10">{link.label}</span>

                {/* Animated Blue Underline Indicator on Hover / Active */}
                <span
                  className={cn(
                    "absolute bottom-1 left-2 right-2 xl:left-3 xl:right-3 h-[2px] origin-center rounded-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-sky-400 dark:from-[#60A5FA] dark:to-cyan-400 transition-all duration-300",
                    isActive
                      ? "opacity-100 scale-x-100"
                      : "opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100"
                  )}
                  aria-hidden="true"
                />

                {/* Subtle soft background pill on hover */}
                <span
                  className="absolute inset-0 rounded-xl bg-[#2563EB]/5 dark:bg-[#3B82F6]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-0"
                  aria-hidden="true"
                />
              </>
            );

            if (isHome) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={linkClass}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={link.href}
                href={{ pathname: "/", hash: link.hash }}
                onClick={() => handleNavClick(link.href)}
                className={linkClass}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* ========================================================= */}
        {/* RIGHT: Desktop Controls & CTA (lg: 1024px+)               */}
        {/* ========================================================= */}
        <div className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 shrink-0">
          {/* Language Selector (UZ / EN / RU) */}
          <LanguageSwitcher align="right" />

          {/* Theme Toggle (Dark / Light) */}
          <ThemeToggle size="md" />

          {/* If logged in: Go to Cabinet */}
          {isLoggedIn ? (
            <Link
              href="/cabinet"
              className={cn(
                "group relative inline-flex items-center justify-center gap-1.5 xl:gap-2 rounded-xl px-3 xl:px-5 py-2.5 text-[12.5px] xl:text-sm font-bold whitespace-nowrap transition-all duration-300",
                "bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#2563EB] hover:from-[#1D4ED8] hover:via-[#2563EB] hover:to-[#3B82F6] text-white",
                "shadow-[0_0_20px_rgba(37,99,235,0.32)] dark:shadow-[0_0_24px_rgba(59,130,246,0.38)]",
                "hover:shadow-[0_0_30px_rgba(37,99,235,0.52)] hover:-translate-y-0.5 active:scale-[0.98]",
                "border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
              )}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>{t("cabinet")}</span>
              <ArrowRight className="h-3.5 w-3.5 xl:h-4 xl:w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              {/* Portal Login Link */}
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 xl:px-3.5 py-2 text-[12.5px] xl:text-sm font-semibold whitespace-nowrap transition-all duration-200",
                  "border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.12)]",
                  "bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#0F172A] hover:text-[#2563EB]",
                  "dark:bg-[#111C30]/80 dark:hover:bg-[#1E293B] dark:text-[#F8FAFC] dark:hover:text-[#60A5FA]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                )}
              >
                <LogIn className="h-3.5 w-3.5 xl:h-4 xl:w-4" aria-hidden="true" />
                <span>{t("login")}</span>
              </Link>

              {/* Waitlist / Early Access Primary CTA */}
              {isHome ? (
                <a
                  href="#waitlist"
                  className={cn(
                    "group relative inline-flex items-center justify-center gap-1.5 xl:gap-2 rounded-xl px-3 xl:px-5 py-2.5 text-[12.5px] xl:text-sm font-bold whitespace-nowrap transition-all duration-300",
                    "bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#2563EB] hover:from-[#1D4ED8] hover:via-[#2563EB] hover:to-[#3B82F6] text-white",
                    "dark:from-[#3B82F6] dark:via-[#2563EB] dark:to-[#3B82F6] dark:hover:from-[#60A5FA] dark:hover:to-[#3B82F6]",
                    "shadow-[0_0_20px_rgba(37,99,235,0.32)] dark:shadow-[0_0_24px_rgba(59,130,246,0.38)]",
                    "hover:shadow-[0_0_30px_rgba(37,99,235,0.52)] dark:hover:shadow-[0_0_32px_rgba(96,165,250,0.55)] hover:-translate-y-0.5 active:scale-[0.98]",
                    "border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1220]"
                  )}
                >
                  <Sparkles
                    className="hidden xl:inline-block h-4 w-4 text-blue-100"
                    aria-hidden="true"
                  />
                  <span>{t("cta")}</span>
                  <ArrowRight className="h-3.5 w-3.5 xl:h-4 xl:w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
              ) : (
                <Link
                  href={{ pathname: "/", hash: "waitlist" }}
                  className={cn(
                    "group relative inline-flex items-center justify-center gap-1.5 xl:gap-2 rounded-xl px-3 xl:px-5 py-2.5 text-[12.5px] xl:text-sm font-bold whitespace-nowrap transition-all duration-300",
                    "bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#2563EB] hover:from-[#1D4ED8] hover:via-[#2563EB] hover:to-[#3B82F6] text-white",
                    "dark:from-[#3B82F6] dark:via-[#2563EB] dark:to-[#3B82F6] dark:hover:from-[#60A5FA] dark:hover:to-[#3B82F6]",
                    "shadow-[0_0_20px_rgba(37,99,235,0.32)] dark:shadow-[0_0_24px_rgba(59,130,246,0.38)]",
                    "hover:shadow-[0_0_30px_rgba(37,99,235,0.52)] dark:hover:shadow-[0_0_32px_rgba(96,165,250,0.55)] hover:-translate-y-0.5 active:scale-[0.98]",
                    "border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1220]"
                  )}
                >
                  <Sparkles
                    className="hidden xl:inline-block h-4 w-4 text-blue-100"
                    aria-hidden="true"
                  />
                  <span>{t("cta")}</span>
                  <ArrowRight className="h-3.5 w-3.5 xl:h-4 xl:w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              )}
            </>
          )}
        </div>

        {/* ========================================================= */}
        {/* TABLET / MOBILE CONTROLS (< 1024px)                       */}
        {/* ========================================================= */}
        <div className="flex lg:hidden items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Show Language Selector & Compact CTA on Tablet (sm: 640px - 1023px) */}
          <div className="hidden sm:flex items-center gap-2">
            <LanguageSwitcher align="right" />
          </div>

          <ThemeToggle size="sm" className="sm:h-10 sm:w-10" />

          {isLoggedIn ? (
            <Link
              href="/cabinet"
              className={cn(
                "hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap text-white transition-all duration-300",
                "bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB]",
                "shadow-[0_0_16px_rgba(37,99,235,0.3)] hover:shadow-[0_0_24px_rgba(59,130,246,0.5)]",
                "border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("cabinet")}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "hidden sm:inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors",
                  "border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.12)]",
                  "bg-[#F8FAFC] dark:bg-[#111C30]/80 text-[#0F172A] dark:text-[#F8FAFC]"
                )}
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("login")}</span>
              </Link>

              <Link
                href="/signup"
                className={cn(
                  "hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap text-white transition-all duration-300",
                  "bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB]",
                  "shadow-[0_0_16px_rgba(37,99,235,0.3)] hover:shadow-[0_0_24px_rgba(59,130,246,0.5)]",
                  "border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                )}
              >
                <span>{t("register")}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={t("menuToggle")}
            className={cn(
              "inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95",
              "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-blue-300",
              "dark:border-[rgba(255,255,255,0.08)] dark:bg-[#111C30] dark:text-[#F8FAFC] dark:hover:bg-[#16223a] dark:hover:border-blue-500/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            )}
          >
            {isMobileMenuOpen ? (
              <X
                className="h-5 w-5 text-[#2563EB] dark:text-[#60A5FA]"
                aria-hidden="true"
              />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE / TABLET DRAWER: Full Responsive Animated Menu     */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0B1220] shadow-2xl overflow-hidden transition-colors duration-200"
        >
          <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
            {/* Nav links */}
            <nav className="flex flex-col space-y-1.5" aria-label="Mobile navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeSection === link.href;
                const itemClass = cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]"
                    : "text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#111C30]"
                );
                const inner = (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon
                        className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{link.label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-40" aria-hidden="true" />
                  </>
                );

                if (isHome) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => handleNavClick(link.href)}
                      className={itemClass}
                    >
                      {inner}
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={{ pathname: "/", hash: link.hash }}
                    onClick={() => handleNavClick(link.href)}
                    className={itemClass}
                  >
                    {inner}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom controls inside mobile drawer (Language, Theme, CTA) */}
            <div className="pt-4 border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <LanguageSwitcher
                  align="left"
                  placement="top"
                  onSelect={() => setIsMobileMenuOpen(false)}
                />
                <ThemeToggle size="md" />
              </div>

              {isLoggedIn ? (
                <Link
                  href="/cabinet"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-base font-bold text-white transition-all duration-200",
                    "bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#2563EB] shadow-[0_0_24px_rgba(37,99,235,0.35)] active:scale-[0.98]"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  <span>{t("cabinet")}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-colors",
                      "border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.12)]",
                      "bg-[#F8FAFC] dark:bg-[#111C30] text-[#0F172A] dark:text-[#F8FAFC]"
                    )}
                  >
                    <LogIn
                      className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]"
                      aria-hidden="true"
                    />
                    <span>{t("login")}</span>
                  </Link>

                  {isHome ? (
                    <a
                      href="#waitlist"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-base font-bold text-white transition-all duration-200",
                        "bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#2563EB] shadow-[0_0_24px_rgba(37,99,235,0.35)] active:scale-[0.98]"
                      )}
                    >
                      <Sparkles className="h-4 w-4 text-blue-100" aria-hidden="true" />
                      <span>{t("cta")}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link
                      href={{ pathname: "/", hash: "waitlist" }}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-base font-bold text-white transition-all duration-200",
                        "bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#2563EB] shadow-[0_0_24px_rgba(37,99,235,0.35)] active:scale-[0.98]"
                      )}
                    >
                      <Sparkles className="h-4 w-4 text-blue-100" aria-hidden="true" />
                      <span>{t("cta")}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
