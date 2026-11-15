"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "transflow_demo_notice_dismissed";

export function DemoNoticeAlert({ className }: { className?: string }) {
  const t = useTranslations("demoBanner");
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (dismissed === "1") {
        setIsDismissed(true);
      }
    } catch {}
  }, []);

  if (!mounted || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start justify-between gap-2.5 transition-all ${className || ""}`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-snug">{t("demoNotice")}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t("dismiss")}
        className="shrink-0 p-1 text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-50 rounded transition-colors"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
