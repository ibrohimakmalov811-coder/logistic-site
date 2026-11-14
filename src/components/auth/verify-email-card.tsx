"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle2, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  devVerifyEmailAction,
  resendVerificationAction,
} from "@/actions/auth";

interface VerifyEmailCardProps {
  email?: string;
  isDevSandbox?: boolean;
}

export function VerifyEmailCard({
  email = "",
  isDevSandbox = false,
}: VerifyEmailCardProps) {
  const t = useTranslations("Auth.verifyEmail");
  const locale = useLocale();
  const router = useRouter();

  const [resending, setResending] = React.useState(false);
  const [resent, setResent] = React.useState(false);
  const [verifyingDev, setVerifyingDev] = React.useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await resendVerificationAction({ email, locale });
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  const handleDevVerify = async () => {
    if (!isDevSandbox || !email) return;
    setVerifyingDev(true);
    try {
      const res = await devVerifyEmailAction({ email, locale });
      if (res.ok && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    } finally {
      setVerifyingDev(false);
    }
  };

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <MailCheck className="h-7 w-7" />
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {email ? t("sentToAddress", { email }) : t("sentGeneric")}
      </p>

      {resent && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t("resentNotice")}</span>
        </div>
      )}

      {email && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResend}
          isLoading={resending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("resendButton")}
        </Button>
      )}

      {isDevSandbox && email && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2 text-left">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{t("devSandboxTitle")}</span>
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleDevVerify}
            isLoading={verifyingDev}
          >
            {t("devVerifyButton")}
          </Button>
        </div>
      )}

      <div className="pt-2">
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
