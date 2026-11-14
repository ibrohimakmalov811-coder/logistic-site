"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, Truck, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

const VISITOR_ROLE_COOKIE = "tf_visitor_role";

function hasVisitorRoleCookie(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split(";")
    .some((item) => item.trim().startsWith(`${VISITOR_ROLE_COOKIE}=`));
}

function setVisitorRoleCookie(value: string): void {
  const maxAge = 60 * 60 * 24 * 90; // 90 days
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${VISITOR_ROLE_COOKIE}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
}

export function RoleSelectorModal() {
  const t = useTranslations("RoleModal");
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Only show on the public home page after initial paint if no interaction cookie is set
  const isHome = pathname === "/";

  React.useEffect(() => {
    if (!isHome || hasVisitorRoleCookie()) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isHome]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisitorRoleCookie("dismissed");
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open || !isHome) {
    return null;
  }

  const handleDismiss = () => {
    setVisitorRoleCookie("dismissed");
    setOpen(false);
  };

  const handleSelect = (choice: "company" | "driver") => {
    setVisitorRoleCookie(choice);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("closeLabel")}
          className="absolute right-4 top-4 rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 pr-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {siteConfig.name}
          </p>
          <h2
            id="role-modal-title"
            className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading"
          >
            {t("title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/signup?role=company_owner"
            onClick={() => handleSelect("company")}
            className="group rounded-2xl border border-border bg-secondary/40 hover:border-primary hover:bg-primary/5 p-5 transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t("companyCardTitle")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("companyCardDesc")}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary group-hover:underline">
              {t("companyCardAction")} &rarr;
            </span>
          </Link>

          <Link
            href="/signup?role=driver"
            onClick={() => handleSelect("driver")}
            className="group rounded-2xl border border-border bg-secondary/40 hover:border-primary hover:bg-primary/5 p-5 transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t("driverCardTitle")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("driverCardDesc")}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary group-hover:underline">
              {t("driverCardAction")} &rarr;
            </span>
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs">
          <Link
            href="/login"
            onClick={handleDismiss}
            className="font-semibold text-primary hover:underline"
          >
            {t("existingAccountLogin")}
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            {t("exploreFirst")}
          </button>
        </div>
      </div>
    </div>
  );
}
