"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PackageOpen,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOutAction } from "@/actions/auth";
import { DemoBanner } from "@/components/common/demo-banner";
import { NotificationsPopover } from "@/components/common/notifications-popover";
import type { UserRole } from "@/types/database";
import { cn } from "@/lib/utils";

interface CompanyShellProps {
  companyName: string;
  userName: string;
  role: UserRole;
  isDevSandbox?: boolean;
  children: React.ReactNode;
}

export function CompanyShell({
  companyName,
  userName,
  role,
  isDevSandbox = false,
  children,
}: CompanyShellProps) {
  const t = useTranslations("CompanyPortal.nav");
  const tRole = useTranslations("Auth.signup.roles");
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const navItems = [
    { href: "/app/company", label: t("overview"), icon: LayoutDashboard, exact: true },
    { href: "/app/company/orders", label: t("orders"), icon: ClipboardList },
    { href: "/app/company/drivers", label: t("drivers"), icon: Users },
    { href: "/app/company/vehicles", label: t("vehicles"), icon: Truck },
    { href: "/app/company/reports", label: t("reports"), icon: BarChart3 },
    { href: "/app/company/settings", label: t("settings"), icon: Settings },
  ];

  const futureItems = [
    { href: "/app/company/map", label: t("liveMap"), icon: MapPin },
    { href: "/app/company/backhaul", label: t("backhaul"), icon: PackageOpen },
  ];

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

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const renderLinks = (onNavigate?: () => void) => (
    <div className="space-y-6">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="space-y-1 pt-4 border-t border-border/60">
        <p className="px-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t("phase2Section")}
        </p>
        {futureItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                {t("soonTag")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-border bg-card shrink-0">
        <div className="h-16 px-5 border-b border-border flex items-center">
          <Link href="/app/company" aria-label={companyName}>
            <BrandLogo size="sm" />
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-border/60 bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{companyName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {userName} ·{" "}
                {role === "company_owner"
                  ? tRole("owner.title")
                  : tRole("dispatcher.title")}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label={t("sidebarAria")}>
          {renderLinks()}
        </nav>

        <div className="p-4 border-t border-border/60">
          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DemoBanner />
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t("openMenu")}
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden min-w-0">
              <p className="text-sm font-bold truncate">{companyName}</p>
            </div>
            {isDevSandbox && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("devSandboxTag")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <NotificationsPopover />
            <LanguageSwitcher align="right" />
            <ThemeToggle size="sm" />
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-black/55 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] bg-card border-r border-border h-full flex flex-col p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t("closeMenu")}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {renderLinks(() => setMobileOpen(false))}
            </div>
            <button
              type="button"
              disabled={signingOut}
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 min-h-[44px]"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{t("signOut")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
