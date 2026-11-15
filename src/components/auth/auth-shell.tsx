import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { DemoNoticeAlert } from "@/components/common/demo-notice-alert";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  isDevSandbox?: boolean;
  devBadgeLabel?: string;
}

export function AuthShell({
  title,
  subtitle,
  children,
  isDevSandbox = false,
  devBadgeLabel,
}: AuthShellProps) {
  return (
    <section className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 overflow-x-clip">
      <div className="w-full max-w-lg">
        <DemoNoticeAlert className="mb-4" />

        {isDevSandbox && devBadgeLabel && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{devBadgeLabel}</span>
          </div>
        )}

        <div className="rounded-2xl border border-border/70 bg-card shadow-xl p-6 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              {siteConfig.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
