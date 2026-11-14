"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Phone,
  Shield,
  TicketCheck,
  Truck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TotpSetupCard } from "@/components/auth/totp-setup-card";
import {
  completeOwnerCompanyStepAction,
  finishOnboardingAction,
  redeemInviteCodeAction,
  saveDriverDetailsStepAction,
  saveOnboardingDraftAction,
  savePersonalInfoAction,
} from "@/actions/onboarding";
import type { OnboardingDraftInput } from "@/lib/validations/onboarding";
import type {
  AppLocale,
  FleetSize,
  LegalForm,
  LicenseCategory,
  UserRole,
  VehicleType,
} from "@/types/database";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  role: UserRole;
  initialDraft: OnboardingDraftInput;
  initialHasCompany: boolean;
  initialCompanyName?: string | null;
  initialMfaVerified: boolean;
  initialHasTotp: boolean;
  requestedStep?: number;
}

const LICENSE_OPTIONS: LicenseCategory[] = ["B", "C", "CE", "D", "BE"];
const VEHICLE_TYPE_OPTIONS: VehicleType[] = [
  "tent",
  "refrigerator",
  "flatbed",
  "container",
  "van",
  "other",
];

export function OnboardingWizard({
  role,
  initialDraft,
  initialHasCompany,
  initialCompanyName,
  initialMfaVerified,
  initialHasTotp,
  requestedStep,
}: OnboardingWizardProps) {
  const t = useTranslations("Onboarding");
  const tVehicle = useTranslations("CompanyPortal.vehicles.types");
  const locale = (useLocale() as AppLocale) || "uz";
  const router = useRouter();

  const initialStep =
    requestedStep && requestedStep >= 1 && requestedStep <= 3
      ? requestedStep
      : initialHasCompany
        ? 3
        : initialDraft.step ?? 1;

  const [step, setStep] = React.useState<number>(initialStep);
  const [fullName, setFullName] = React.useState(initialDraft.fullName ?? "");
  const [phone, setPhone] = React.useState(initialDraft.phone ?? "+998 ");

  // Owner step 2 fields
  const [companyName, setCompanyName] = React.useState(
    initialDraft.companyName ?? initialCompanyName ?? ""
  );
  const [legalForm, setLegalForm] = React.useState<LegalForm>(
    initialDraft.legalForm ?? "llc"
  );
  const [cityRegion, setCityRegion] = React.useState(
    initialDraft.cityRegion ?? "Toshkent"
  );
  const [fleetSize, setFleetSize] = React.useState<FleetSize>(
    initialDraft.fleetSize ?? "5-15"
  );
  const [mainCargoTypes, setMainCargoTypes] = React.useState(
    Array.isArray(initialDraft.mainCargoTypes)
      ? initialDraft.mainCargoTypes.join(", ")
      : initialDraft.mainCargoTypes ?? ""
  );

  // Dispatcher/Driver invite step
  const [inviteCode, setInviteCode] = React.useState(
    initialDraft.inviteCode ?? ""
  );
  const [joinedCompanyName, setJoinedCompanyName] = React.useState<string | null>(
    initialCompanyName ?? null
  );

  // Driver step 3 details
  const [licenseCategory, setLicenseCategory] = React.useState<LicenseCategory>(
    initialDraft.licenseCategory ?? "C"
  );
  const [yearsExperience, setYearsExperience] = React.useState<string>(
    String(initialDraft.yearsExperience ?? 3)
  );
  const [vehicleType, setVehicleType] = React.useState<VehicleType>(
    initialDraft.vehicleType ?? "tent"
  );
  const [plateNumber, setPlateNumber] = React.useState(
    initialDraft.plateNumber ?? ""
  );
  const [capacityKg, setCapacityKg] = React.useState<string>(
    String(initialDraft.capacityKg ?? 5000)
  );
  const [vehicleRegion, setVehicleRegion] = React.useState(
    initialDraft.vehicleRegion ?? "Toshkent"
  );

  const [mfaDone, setMfaDone] = React.useState(
    initialHasTotp && initialMfaVerified
  );
  const [draftStatus, setDraftStatus] = React.useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Autosave draft with debounce
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (!fullName && !companyName && !plateNumber) return;
      setDraftStatus("saving");
      await saveOnboardingDraftAction({
        step,
        fullName,
        phone,
        preferredLanguage: locale,
        companyName: companyName || undefined,
        legalForm,
        cityRegion,
        fleetSize,
        mainCargoTypes: mainCargoTypes
          ? mainCargoTypes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        inviteCode: inviteCode || undefined,
        licenseCategory,
        yearsExperience: Number(yearsExperience) || 0,
        vehicleType,
        plateNumber: plateNumber || undefined,
        capacityKg: Number(capacityKg) || undefined,
        vehicleRegion: vehicleRegion || undefined,
      });
      setDraftStatus("saved");
    }, 900);

    return () => clearTimeout(timer);
  }, [
    step,
    fullName,
    phone,
    locale,
    companyName,
    legalForm,
    cityRegion,
    fleetSize,
    mainCargoTypes,
    inviteCode,
    licenseCategory,
    yearsExperience,
    vehicleType,
    plateNumber,
    capacityKg,
    vehicleRegion,
  ]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await savePersonalInfoAction({
        fullName,
        phone,
        preferredLanguage: locale,
      });
      if (!res.ok) {
        setErrorMsg(t("errors.personalInvalid"));
        return;
      }
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await completeOwnerCompanyStepAction({
        companyName,
        legalForm,
        cityRegion,
        fleetSize,
        mainCargoTypes: mainCargoTypes
          ? mainCargoTypes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      });
      if (!res.ok) {
        setErrorMsg(t("errors.companyInvalid"));
        return;
      }
      setJoinedCompanyName(res.companyName ?? companyName);
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await redeemInviteCodeAction({ inviteCode });
      if (!res.ok) {
        setErrorMsg(
          res.errorCode === "RATE_LIMITED"
            ? t("errors.rateLimited")
            : t("errors.invalidInvite")
        );
        return;
      }
      setJoinedCompanyName(res.companyName ?? "");
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishManager = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await finishOnboardingAction(locale);
      if (!res.ok) {
        setErrorMsg(t("errors.finishFailed"));
        return;
      }
      if (res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const detailsRes = await saveDriverDetailsStepAction({
        inviteCode: inviteCode || undefined,
        licenseCategory,
        yearsExperience: Number(yearsExperience) || 0,
        vehicleType,
        plateNumber,
        capacityKg: Number(capacityKg) || 1000,
        vehicleRegion,
      });
      if (!detailsRes.ok) {
        setErrorMsg(t("errors.driverDetailsInvalid"));
        return;
      }

      const finishRes = await finishOnboardingAction(locale);
      if (!finishRes.ok) {
        setErrorMsg(t("errors.finishFailed"));
        return;
      }
      if (finishRes.redirectTo) {
        router.push(finishRes.redirectTo);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const stepsMeta = [
    { num: 1, label: t("steps.personal") },
    {
      num: 2,
      label:
        role === "company_owner" ? t("steps.createCompany") : t("steps.joinCompany"),
    },
    {
      num: 3,
      label: role === "driver" ? t("steps.driverSetup") : t("steps.securityMfa"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between gap-2">
        {stepsMeta.map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <div key={s.num} className="flex-1 min-w-0">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors mb-2",
                  completed
                    ? "bg-emerald-500"
                    : active
                      ? "bg-primary"
                      : "bg-border"
                )}
              />
              <p
                className={cn(
                  "text-[11px] font-medium truncate",
                  active
                    ? "text-primary"
                    : completed
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {s.num}. {s.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Autosave status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary" />
          {t("privacyMicroNote")}
        </span>
        <span className="shrink-0 ml-2">
          {draftStatus === "saving"
            ? t("draftSaving")
            : draftStatus === "saved"
              ? t("draftSaved")
              : ""}
        </span>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Personal Profile */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="ob-fullname"
              className="block text-sm font-medium text-foreground"
            >
              {t("fields.fullName")}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                id="ob-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("placeholders.fullName")}
                className="pl-11"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="ob-phone"
              className="block text-sm font-medium text-foreground"
            >
              {t("fields.phone")}
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                id="ob-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="pl-11"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("phoneFormatHint")}</p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={submitting}
          >
            {t("continueButton")}
          </Button>
        </form>
      )}

      {/* STEP 2A: Company Owner creates company */}
      {step === 2 && role === "company_owner" && (
        <form onSubmit={handleOwnerCompanySubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="ob-company-name"
              className="block text-sm font-medium text-foreground"
            >
              {t("fields.companyName")}
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                id="ob-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("placeholders.companyName")}
                className="pl-11"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="ob-legal-form"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.legalForm")}
              </label>
              <Select
                id="ob-legal-form"
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value as LegalForm)}
              >
                <option value="llc">{t("legalForms.llc")}</option>
                <option value="ie">{t("legalForms.ie")}</option>
                <option value="jsc">{t("legalForms.jsc")}</option>
                <option value="other">{t("legalForms.other")}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ob-fleet-size"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.fleetSize")}
              </label>
              <Select
                id="ob-fleet-size"
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value as FleetSize)}
              >
                <option value="1-4">1–4</option>
                <option value="5-15">5–15</option>
                <option value="16-30">16–30</option>
                <option value="30+">30+</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="ob-city"
              className="block text-sm font-medium text-foreground"
            >
              {t("fields.city")}
            </label>
            <Input
              id="ob-city"
              type="text"
              value={cityRegion}
              onChange={(e) => setCityRegion(e.target.value)}
              placeholder={t("placeholders.city")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="ob-cargo-types"
              className="block text-sm font-medium text-foreground"
            >
              {t("fields.mainCargoTypes")}
            </label>
            <Input
              id="ob-cargo-types"
              type="text"
              value={mainCargoTypes}
              onChange={(e) => setMainCargoTypes(e.target.value)}
              placeholder={t("placeholders.mainCargoTypes")}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="w-1/3"
            >
              {t("backButton")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              isLoading={submitting}
            >
              {t("continueButton")}
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2B: Dispatcher or Driver redeems 1-time invite code */}
      {step === 2 && (role === "dispatcher" || role === "driver") && (
        <form onSubmit={handleRedeemInvite} className="space-y-4">
          {joinedCompanyName ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">
                  {t("joinedCompanyTitle", { company: joinedCompanyName })}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground rounded-xl bg-secondary/50 border border-border px-3.5 py-2.5">
                {t("inviteInstructions")}
              </p>
              <label
                htmlFor="ob-invite-code"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.inviteCode")}
              </label>
              <div className="relative">
                <TicketCheck className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="ob-invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="pl-11 font-mono uppercase tracking-wider"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="w-1/3"
            >
              {t("backButton")}
            </Button>
            {joinedCompanyName ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => setStep(3)}
              >
                {t("continueButton")}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                isLoading={submitting}
              >
                {t("verifyInviteButton")}
              </Button>
            )}
          </div>
        </form>
      )}

      {/* STEP 3A: Mandatory TOTP MFA for Owner & Dispatcher */}
      {step === 3 && (role === "company_owner" || role === "dispatcher") && (
        <div className="space-y-5">
          {joinedCompanyName && (
            <p className="text-xs text-muted-foreground">
              {t("companyConfirmed", { company: joinedCompanyName })}
            </p>
          )}

          <TotpSetupCard
            alreadyEnrolled={mfaDone}
            mandatory
            onVerified={() => setMfaDone(true)}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="w-1/3"
            >
              {t("backButton")}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!mfaDone}
              isLoading={submitting}
              onClick={handleFinishManager}
            >
              {t("finishOwnerButton")}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3B: Driver license, vehicle details + optional MFA */}
      {step === 3 && role === "driver" && (
        <form onSubmit={handleFinishDriver} className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t("fields.licenseCategories")}
            </p>
            <div className="flex flex-wrap gap-2">
              {LICENSE_OPTIONS.map((cat) => {
                const selected = licenseCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLicenseCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm font-semibold transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/40 text-foreground hover:border-primary/50"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="ob-years-exp"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.yearsExperience")}
              </label>
              <Input
                id="ob-years-exp"
                type="number"
                min={0}
                max={60}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ob-vehicle-type"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.vehicleType")}
              </label>
              <Select
                id="ob-vehicle-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              >
                {VEHICLE_TYPE_OPTIONS.map((vt) => (
                  <option key={vt} value={vt}>
                    {tVehicle(vt)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="ob-plate-number"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.plateNumber")}
              </label>
              <div className="relative">
                <Truck className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ob-plate-number"
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="01 A 774 KA"
                  className="pl-9 uppercase font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ob-capacity-kg"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.capacityKg")}
              </label>
              <Input
                id="ob-capacity-kg"
                type="number"
                min={500}
                max={120000}
                value={capacityKg}
                onChange={(e) => setCapacityKg(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ob-vehicle-region"
                className="block text-sm font-medium text-foreground"
              >
                {t("fields.vehicleRegion")}
              </label>
              <Input
                id="ob-vehicle-region"
                type="text"
                value={vehicleRegion}
                onChange={(e) => setVehicleRegion(e.target.value)}
                placeholder="Toshkent"
                required
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span>{t("optionalDriverMfaTitle")}</span>
            </div>
            <TotpSetupCard
              alreadyEnrolled={mfaDone}
              mandatory={false}
              onVerified={() => setMfaDone(true)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="w-1/3"
            >
              {t("backButton")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              isLoading={submitting}
            >
              {t("finishDriverButton")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
