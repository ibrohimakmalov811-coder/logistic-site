"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { waitlistSchema, type WaitlistInput } from "@/lib/validations/waitlist";
import { submitWaitlistAction } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Turnstile } from "@/components/ui/turnstile";
import { Link } from "@/i18n/routing";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitlistFormProps {
  id?: string;
  className?: string;
}

export function WaitlistForm({ id = "waitlist-form", className }: WaitlistFormProps) {
  const t = useTranslations("waitlistForm");
  const tVal = useTranslations("validation");
  const locale = useLocale() as "uz" | "ru" | "en";

  const [turnstileToken, setTurnstileToken] = React.useState<string>("");
  const [submissionState, setSubmissionState] = React.useState<{
    isSuccess: boolean;
    isDuplicate: boolean;
    errorMessage?: string;
  }>({
    isSuccess: false,
    isDuplicate: false,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WaitlistInput>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      fullName: "",
      phone: "+998",
      companyName: "",
      role: "owner",
      fleetSize: "5-15",
      preferredLanguage: locale,
      consent: true,
      hp_company_website: "",
    },
  });

  // Keep preferredLanguage synced with current page locale initially
  React.useEffect(() => {
    setValue("preferredLanguage", locale);
  }, [locale, setValue]);

  const onSubmit = async (data: WaitlistInput) => {
    setSubmissionState({ isSuccess: false, isDuplicate: false });

    // Include turnstile token
    const payload = {
      ...data,
      turnstileToken: turnstileToken || "test-token",
    };

    const result = await submitWaitlistAction(payload);

    if (result.success) {
      setSubmissionState({ isSuccess: true, isDuplicate: false });
      reset();
    } else {
      if (result.error === "duplicate_phone") {
        setSubmissionState({
          isSuccess: false,
          isDuplicate: true,
          errorMessage: t("duplicateMessage"),
        });
      } else if (result.error === "rate_limit_exceeded") {
        setSubmissionState({
          isSuccess: false,
          isDuplicate: false,
          errorMessage: t("rateLimitError"),
        });
      } else if (result.error === "turnstile_failed") {
        setSubmissionState({
          isSuccess: false,
          isDuplicate: false,
          errorMessage: t("botDetected"),
        });
      } else if (result.error === "database_unavailable") {
        setSubmissionState({
          isSuccess: false,
          isDuplicate: false,
          errorMessage: t("unavailable"),
        });
      } else {
        setSubmissionState({
          isSuccess: false,
          isDuplicate: false,
          errorMessage: t("errorGeneral"),
        });
      }
    }
  };

  // Turnstile public sitekey from env (or official Cloudflare test site key)
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

  return (
    <div
      id={id}
      className={cn(
        "rounded-3xl border border-border/80 bg-card/95 p-6 sm:p-8 md:p-10 shadow-2xl transition-colors",
        className
      )}
    >
      {/* Header */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("title")}</span>
        </div>
        <h3 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h3>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t("subtitle")}
        </p>
      </div>

      {/* Success State */}
      {submissionState.isSuccess && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-300"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 mb-4">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <h4 className="font-heading text-xl font-bold text-foreground">
            {t("successTitle")}
          </h4>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            {t("successMessage")}
          </p>
          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmissionState({ isSuccess: false, isDuplicate: false })}
            >
              {locale === "uz"
                ? "Boshqa raqam kiritish"
                : locale === "ru"
                  ? "Зарегистрировать другой номер"
                  : "Submit another number"}
            </Button>
          </div>
        </div>
      )}

      {/* Duplicate Phone Notice */}
      {submissionState.isDuplicate && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-left mb-6 flex items-start gap-3"
        >
          <AlertCircle
            className="h-5 w-5 shrink-0 text-amber-500 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h5 className="text-sm font-semibold text-foreground">
              {t("duplicateTitle")}
            </h5>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {submissionState.errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* General Error Notice */}
      {submissionState.errorMessage && !submissionState.isDuplicate && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-left mb-6 flex items-start gap-3"
        >
          <AlertCircle
            className="h-5 w-5 shrink-0 text-destructive mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-destructive-foreground">
            {submissionState.errorMessage}
          </p>
        </div>
      )}

      {/* Form Content */}
      {!submissionState.isSuccess && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Honeypot field (hidden from genuine users, traps spam bots) */}
          <div
            className="absolute -left-[9999px] opacity-0 pointer-events-none -z-50"
            aria-hidden="true"
            tabIndex={-1}
          >
            <label htmlFor="hp_company_website" className="sr-only">
              Website
            </label>
            <input
              id="hp_company_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register("hp_company_website")}
            />
          </div>

          {/* Full Name & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t("fullNamePlaceholder")}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p id="fullName-error" className="text-xs text-rose-500 font-medium">
                  {tVal(errors.fullName.message?.replace("validation.", "") as any) ||
                    errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("phoneLabel")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t("phonePlaceholder")}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
              {errors.phone && (
                <p id="phone-error" className="text-xs text-rose-500 font-medium">
                  {tVal(errors.phone.message?.replace("validation.", "") as any) ||
                    errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="companyName">{t("companyNameLabel")}</Label>
            <Input
              id="companyName"
              type="text"
              placeholder={t("companyNamePlaceholder")}
              aria-invalid={Boolean(errors.companyName)}
              aria-describedby={errors.companyName ? "companyName-error" : undefined}
              {...register("companyName")}
            />
            {errors.companyName && (
              <p id="companyName-error" className="text-xs text-rose-500 font-medium">
                {tVal(errors.companyName.message?.replace("validation.", "") as any) ||
                  errors.companyName.message}
              </p>
            )}
          </div>

          {/* Role & Fleet Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="role">{t("roleLabel")}</Label>
              <Select id="role" {...register("role")}>
                <option value="owner">{t("roleOwner")}</option>
                <option value="dispatcher">{t("roleDispatcher")}</option>
                <option value="driver">{t("roleDriver")}</option>
                <option value="other">{t("roleOther")}</option>
              </Select>
              {errors.role && (
                <p className="text-xs text-rose-500 font-medium">
                  {tVal(errors.role.message?.replace("validation.", "") as any) ||
                    errors.role.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fleetSize">{t("fleetLabel")}</Label>
              <Select id="fleetSize" {...register("fleetSize")}>
                <option value="1-4">{t("fleet1_4")}</option>
                <option value="5-15">{t("fleet5_15")}</option>
                <option value="16-30">{t("fleet16_30")}</option>
                <option value="30+">{t("fleet30plus")}</option>
              </Select>
              {errors.fleetSize && (
                <p className="text-xs text-rose-500 font-medium">
                  {tVal(errors.fleetSize.message?.replace("validation.", "") as any) ||
                    errors.fleetSize.message}
                </p>
              )}
            </div>
          </div>

          {/* Preferred Language */}
          <div className="space-y-1.5">
            <Label htmlFor="preferredLanguage">{t("langLabel")}</Label>
            <Select id="preferredLanguage" {...register("preferredLanguage")}>
              <option value="uz">{t("langUz")}</option>
              <option value="ru">{t("langRu")}</option>
              <option value="en">{t("langEn")}</option>
            </Select>
            {errors.preferredLanguage && (
              <p className="text-xs text-rose-500 font-medium">
                {tVal(
                  errors.preferredLanguage.message?.replace("validation.", "") as any
                ) || errors.preferredLanguage.message}
              </p>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                {...register("consent")}
              />
              <span className="text-xs sm:text-sm text-muted-foreground leading-snug select-none">
                {t("consentPrefix")}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-medium text-primary hover:underline"
                >
                  {t("consentLink")}
                </Link>
                {t("consentSuffix")}
              </span>
            </label>
            {errors.consent && (
              <p className="mt-1 text-xs text-rose-500 font-medium">
                {tVal("consentRequired")}
              </p>
            )}
          </div>

          {/* Turnstile Bot Protection */}
          <Turnstile
            siteKey={siteKey}
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken("")}
          />

          {/* Submit Button */}
          <div className="pt-3">
            <Button
              type="submit"
              variant="amber"
              size="lg"
              className="w-full text-base sm:text-lg font-bold shadow-xl shadow-amber-500/20"
              isLoading={isSubmitting}
            >
              {isSubmitting ? t("submitting") : t("submitBtn")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
