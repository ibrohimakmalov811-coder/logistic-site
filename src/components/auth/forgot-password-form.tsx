"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/ui/turnstile";
import { forgotPasswordAction } from "@/actions/auth";

interface ForgotPasswordFormProps {
  turnstileSiteKey: string;
  nonce?: string;
}

export function ForgotPasswordForm({
  turnstileSiteKey,
  nonce,
}: ForgotPasswordFormProps) {
  const t = useTranslations("Auth.forgotPassword");
  const tErr = useTranslations("Auth.errors");
  const locale = useLocale();

  const [email, setEmail] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await forgotPasswordAction({
        email,
        locale,
        turnstileToken,
      });

      if (!res.ok) {
        if (res.errorCode === "RATE_LIMITED") {
          setErrorMessage(tErr("rateLimited"));
        } else if (res.errorCode === "CAPTCHA_FAILED") {
          setErrorMessage(tErr("captchaFailed"));
        } else {
          setErrorMessage(tErr("validationError"));
        }
        return;
      }

      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("sentMessage")}
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-primary hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="forgot-email"
          className="block text-sm font-medium text-foreground"
        >
          {t("emailLabel")}
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="name@company.uz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11"
            required
          />
        </div>
      </div>

      <Turnstile
        siteKey={turnstileSiteKey}
        onVerify={setTurnstileToken}
        nonce={nonce}
      />

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        isLoading={submitting}
      >
        {t("submitButton")}
      </Button>

      <div className="text-center pt-1">
        <Link href="/login" className="text-sm text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      </div>
    </form>
  );
}
