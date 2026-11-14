"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/actions/auth";

interface ResetPasswordFormProps {
  devToken?: string;
}

export function ResetPasswordForm({ devToken }: ResetPasswordFormProps) {
  const t = useTranslations("Auth.resetPassword");
  const tErr = useTranslations("Auth.errors");
  const locale = useLocale();
  const router = useRouter();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage(t("passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPasswordAction({
        password,
        confirmPassword,
        locale,
        devToken,
      });

      if (!res.ok) {
        setErrorMessage(
          res.errorCode === "SESSION_EXPIRED"
            ? t("sessionExpired")
            : tErr("validationError")
        );
        return;
      }

      if (res.redirectTo) {
        router.push(res.redirectTo);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="reset-password"
          className="block text-sm font-medium text-foreground"
        >
          {t("newPasswordLabel")}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-11"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("passwordRuleHint")}</p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="reset-confirm-password"
          className="block text-sm font-medium text-foreground"
        >
          {t("confirmPasswordLabel")}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-11"
            required
          />
        </div>
      </div>

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
    </form>
  );
}
