"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Copy, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enrollTotpAction, verifyTotpAction } from "@/actions/auth";

interface TotpSetupCardProps {
  alreadyEnrolled?: boolean;
  mandatory?: boolean;
  onVerified?: () => void;
  onSkip?: () => void;
}

export function TotpSetupCard({
  alreadyEnrolled = false,
  mandatory = false,
  onVerified,
  onSkip,
}: TotpSetupCardProps) {
  const t = useTranslations("Auth.mfa");
  const locale = useLocale();

  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [devTestCode, setDevTestCode] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [verified, setVerified] = React.useState(alreadyEnrolled);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleStartEnroll = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await enrollTotpAction();
      if (!res.ok || !res.data) {
        setErrorMsg(t("enrollError"));
        return;
      }
      setFactorId(String(res.data.factorId ?? ""));
      setQrCode(String(res.data.qrCode ?? ""));
      setSecret(String(res.data.secret ?? ""));
      if (typeof res.data.devCurrentTotpCode === "string") {
        setDevTestCode(res.data.devCurrentTotpCode);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setVerifying(true);
    try {
      const res = await verifyTotpAction({
        code,
        factorId: factorId ?? undefined,
        locale,
      });
      if (!res.ok) {
        setErrorMsg(t("invalidCode"));
        return;
      }
      setVerified(true);
      onVerified?.();
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">{t("enabledTitle")}</p>
          <p className="text-muted-foreground mt-1">{t("enabledDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/15 p-2 text-primary shrink-0">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("setupTitle")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {mandatory ? t("mandatoryNote") : t("optionalNote")}
          </p>
        </div>
      </div>

      {!qrCode ? (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleStartEnroll}
            isLoading={loading}
          >
            {t("startButton")}
          </Button>
          {!mandatory && onSkip && (
            <Button type="button" variant="ghost" onClick={onSkip}>
              {t("skipForNow")}
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-background/80 border border-border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt={t("qrAlt")}
              width={144}
              height={144}
              className="w-36 h-36 rounded-lg border border-border bg-white p-1.5 shrink-0"
            />
            <div className="space-y-2 text-xs text-muted-foreground w-full min-w-0">
              <p className="font-medium text-foreground">{t("scanInstruction")}</p>
              {secret && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-2.5 py-2">
                  <code className="truncate font-mono text-xs text-foreground flex-1">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    aria-label={t("copySecret")}
                    className="text-primary hover:opacity-80 shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
              {devTestCode && (
                <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                  DEV TOTP: {devTestCode}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="totp-setup-code"
              className="block text-sm font-medium text-foreground"
            >
              {t("codeLabel")}
            </label>
            <Input
              id="totp-setup-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="font-mono tracking-[0.35em] text-center text-lg"
              required
            />
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="text-xs text-destructive flex items-center gap-1.5"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={verifying}
              disabled={code.length !== 6}
            >
              {t("verifyButton")}
            </Button>
            {!mandatory && onSkip && (
              <Button type="button" variant="ghost" onClick={onSkip}>
                {t("skipForNow")}
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
