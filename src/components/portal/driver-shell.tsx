"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ClipboardList, LogOut, ShieldCheck, User } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOutAction } from "@/actions/auth";
import { DemoBanner } from "@/components/common/demo-banner";
import { NotificationsPopover } from "@/components/common/notifications-popover";
import { cn } from "@/lib/utils";

interface DriverShellProps {
  companyName: string | null;
  driverName: string;
  isDevSandbox?: boolean;
  children: React.ReactNode;
}

export function DriverShell({
  companyName,
  driverName,
  isDevSandbox = false,
  children,
}: DriverShellProps) {
  const t = useTranslations("DriverPortal.nav");
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const res = await signOutAction(locale);
      router.push(res.redirectTo ?? `/${locale}/login`);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const isOrders =
    pathname === "/app/driver" || pathname.startsWith("/app/driver/orders");
  const isProfile = pathname.startsWith("/app/driver/profile");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DemoBanner />
      {/* Compact Sticky Mobile-First Top Bar */}
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/app/driver" aria-label={driverName} className="shrink-0">
            <BrandLogo size="sm" />
          </Link>
          {companyName && (
            <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground truncate border-l border-border pl-2.5">
              {companyName}
            </span>
          )}
          {isDevSandbox && (
            <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              <ShieldCheck className="h-3 w-3" />
              {t("devSandboxTag")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <NotificationsPopover />
          <LanguageSwitcher align="right" />
          <ThemeToggle size="sm" />
          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            aria-label={t("signOut")}
            className="inline-flex h-9 w-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t("signOut")}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-24">
        {children}
      </main>

      {/* Fixed Bottom Navigation for Drivers (Large >=48px touch targets) */}
      <nav
        aria-label={t("bottomNavAria")}
        className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-2">
          <Link
            href="/app/driver"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-xs font-semibold transition-colors",
              isOrders ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            <span>{t("orders")}</span>
          </Link>
          <Link
            href="/app/driver/profile"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-xs font-semibold transition-colors",
              isProfile ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-5 w-5" aria-hidden="true" />
            <span>{t("profile")}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
