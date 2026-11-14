"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  KeyRound,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TotpSetupCard } from "@/components/auth/totp-setup-card";
import { updateDriverProfileAction } from "@/actions/driver";
import { createDataRequestAction, unenrollTotpAction } from "@/actions/auth";
import type {
  AppLocale,
  DataRequestRow,
  DataRequestType,
  DriverProfileRow,
  ProfileRow,
  VehicleRow,
} from "@/types/database";

interface DriverProfileViewProps {
  profile: ProfileRow;
  driverProfile: DriverProfileRow | null;
  assignedVehicle: VehicleRow | null;
  hasTotpFactor: boolean;
  dataRequests: DataRequestRow[];
}

export function DriverProfileView({
  profile,
  driverProfile,
  assignedVehicle,
  hasTotpFactor,
  dataRequests,
}: DriverProfileViewProps) {
  const t = useTranslations("DriverPortal.profile");
  const format = useFormatter();
  const router = useRouter();

  const [fullName, setFullName] = React.useState(profile.full_name ?? "");
  const [phone, setPhone] = React.useState(profile.phone ?? "+998 ");
  const [preferredLanguage, setPreferredLanguage] = React.useState<AppLocale>(
    profile.preferred_language
  );
  const [saving, setSaving] = React.useState(false);

  const [disablePw, setDisablePw] = React.useState("");
  const [disablingMfa, setDisablingMfa] = React.useState(false);

  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setSaving(true);
    try {
      const res = await updateDriverProfileAction({
        fullName,
        phone,
        preferredLanguage,
      });
      if (!res.ok) {
        setErrorMsg(t("saveError"));
        return;
      }
      setStatusMsg(t("profileSaved"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setDisablingMfa(true);
    try {
      const res = await unenrollTotpAction({ currentPassword: disablePw });
      if (!res.ok) {
        setErrorMsg(t("mfaDisableError"));
        return;
      }
      setDisablePw("");
      setStatusMsg(t("mfaDisabledNotice"));
      router.refresh();
    } finally {
      setDisablingMfa(false);
    }
  };

  const handleDataRequest = async (type: DataRequestType) => {
    const res = await createDataRequestAction({ requestType: type });
    if (res.ok) {
      setStatusMsg(t("dataRequestSubmitted"));
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading">{t("title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {statusMsg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Personal Info & Preferred Language */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-border bg-card/85 p-5 space-y-4"
      >
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span>{t("infoTitle")}</span>
        </h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">{t("fullNameLabel")}</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">{t("phoneLabel")}</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">{t("languageLabel")}</label>
          <Select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value as AppLocale)}
          >
            <option value="uz">O&apos;zbekcha (UZ)</option>
            <option value="ru">Русский (RU)</option>
            <option value="en">English (EN)</option>
          </Select>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full min-h-[48px]"
          isLoading={saving}
        >
          {t("saveButton")}
        </Button>
      </form>

      {/* Assigned Vehicle & License */}
      <div className="rounded-2xl border border-border bg-card/85 p-5 space-y-2 text-sm">
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <span>{t("vehicleTitle")}</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("licensesLabel")}:{" "}
          <strong className="text-foreground">
            {driverProfile?.license_category || "—"}
          </strong>
          {typeof driverProfile?.years_experience === "number"
            ? ` · ${driverProfile.years_experience} ${t("yearsUnit")}`
            : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("assignedVehicleLabel")}:{" "}
          <strong className="text-foreground">
            {assignedVehicle
              ? `${assignedVehicle.plate_number} · ${assignedVehicle.vehicle_type} (${assignedVehicle.region})`
              : t("noVehicleAssigned")}
          </strong>
        </p>
      </div>

      {/* Optional Driver 2FA */}
      <div className="rounded-2xl border border-border bg-card/85 p-5 space-y-4">
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <span>{t("mfaTitle")}</span>
        </h2>
        <TotpSetupCard alreadyEnrolled={hasTotpFactor} mandatory={false} />

        {hasTotpFactor && (
          <form onSubmit={handleDisableMfa} className="space-y-2 pt-2 border-t border-border/60">
            <p className="text-xs text-muted-foreground">{t("disableMfaHint")}</p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={disablePw}
                onChange={(e) => setDisablePw(e.target.value)}
                placeholder={t("currentPasswordPlaceholder")}
                required
              />
              <Button
                type="submit"
                variant="outline"
                isLoading={disablingMfa}
              >
                {t("disableMfaButton")}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Privacy & Data Rights */}
      <div className="rounded-2xl border border-border bg-card/85 p-5 space-y-3">
        <h2 className="text-base font-bold font-heading">{t("privacyTitle")}</h2>
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleDataRequest("export")}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {t("exportData")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/40"
            onClick={() => handleDataRequest("delete")}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("deleteAccount")}
          </Button>
        </div>

        {dataRequests.length > 0 && (
          <div className="text-xs text-muted-foreground pt-1">
            {dataRequests.slice(0, 2).map((req) => (
              <p key={req.id}>
                {req.request_type} &middot; {req.status} &middot;{" "}
                {format.dateTime(new Date(req.created_at), { dateStyle: "short" })}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
