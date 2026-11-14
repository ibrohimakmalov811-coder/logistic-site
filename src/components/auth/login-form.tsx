"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Lock, Mail } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginUser } from "@/lib/storage-auth";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { loadSnapshot } from "@/lib/data";

interface LoginFormProps {
  registered?: boolean;
}

export function LoginForm({ registered = false }: LoginFormProps) {
  const t = useTranslations("Auth.login");
  const tErr = useTranslations("Auth.errors");
  const router = useRouter();

  const { login } = useTransFlowAuth();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await login(identifier, password);
      if (!res.success) {
        // Fallback check against legacy store
        const legacyRes = loginUser(identifier, password);
        if (!legacyRes.success) {
          setErrorMessage(tErr("invalidCredentials"));
          return;
        }
      } else {
        loginUser(identifier, password);
      }

      const snapshot = loadSnapshot();
      const cleanIdent = identifier.trim().toLowerCase();
      const cleanDigits = identifier.replace(/\s+/g, "");
      const matched = snapshot.users.find(
        (u) =>
          u.email.toLowerCase() === cleanIdent ||
          u.phone.replace(/\s+/g, "") === cleanDigits
      );

      if (matched?.role === "driver") {
        router.push("/app/driver");
      } else {
        router.push("/app/company");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {registered && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{t("registeredSuccessBanner")}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="login-identifier"
          className="block text-sm font-medium text-foreground"
        >
          {t("identifierLabel")}
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="login-identifier"
            type="text"
            autoComplete="username"
            placeholder={t("identifierPlaceholder")}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="pl-11"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-foreground"
          >
            {t("passwordLabel")}
          </label>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      <p className="text-center text-sm text-muted-foreground pt-1">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          {t("signupLink")}
        </Link>
      </p>
    </form>
  );
}
