"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  Lock,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TotpSetupCard } from "@/components/auth/totp-setup-card";
import {
  createInviteAction,
  toggleMemberActiveAction,
  updateCompanySettingsAction,
} from "@/actions/company";
import {
  changePasswordAction,
  createDataRequestAction,
} from "@/actions/auth";
import type {
  CompanyRow,
  DataRequestRow,
  FleetSize,
  InviteRow,
  LegalForm,
  UserRole,
} from "@/types/database";

interface CompanySettingsViewProps {
  role: UserRole;
  company: CompanyRow;
  teamMembers: Array<{
    userId: string;
    fullName: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    joinedAt: string;
  }>;
  invites: InviteRow[];
  dataRequests: DataRequestRow[];
  currentUserId: string;
  hasTotpFactor: boolean;
}

export function CompanySettingsView({
  role,
  company,
  teamMembers,
  invites,
  dataRequests,
  currentUserId,
  hasTotpFactor,
}: CompanySettingsViewProps) {
  const t = useTranslations("CompanyPortal.settings");
  const format = useFormatter();
  const router = useRouter();
  const isOwner = role === "company_owner";

  // Company details state
  const [name, setName] = React.useState(company.name);
  const [legalForm, setLegalForm] = React.useState<LegalForm>(company.legal_form);
  const [cityRegion, setCityRegion] = React.useState(company.city_region);
  const [fleetSize, setFleetSize] = React.useState<FleetSize>(company.fleet_size);
  const [savingCompany, setSavingCompany] = React.useState(false);

  // Team invite state
  const [dispatcherEmail, setDispatcherEmail] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const [newInviteCode, setNewInviteCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPw, setChangingPw] = React.useState(false);

  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setSavingCompany(true);
    try {
      const res = await updateCompanySettingsAction({
        name,
        legalForm,
        cityRegion,
        fleetSize,
      });
      if (!res.ok) {
        setErrorMsg(t("saveError"));
        return;
      }
      setStatusMsg(t("companySaved"));
      router.refresh();
    } finally {
      setSavingCompany(false);
    }
  };

  const handleInviteDispatcher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setErrorMsg(null);
    setNewInviteCode(null);
    setInviting(true);
    try {
      const res = await createInviteAction({
        role: "dispatcher",
        invitedEmail: dispatcherEmail.trim() || undefined,
      });
      if (res.ok && res.inviteCode) {
        setNewInviteCode(res.inviteCode);
        setDispatcherEmail("");
        router.refresh();
      }
    } finally {
      setInviting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    if (newPassword !== confirmPassword) {
      setErrorMsg(t("passwordMismatch"));
      return;
    }
    setChangingPw(true);
    try {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!res.ok) {
        setErrorMsg(t("passwordChangeError"));
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatusMsg(t("passwordChanged"));
    } finally {
      setChangingPw(false);
    }
  };

  const handleDataRequest = async (type: "export" | "delete") => {
    setErrorMsg(null);
    setStatusMsg(null);
    const res = await createDataRequestAction({ requestType: type });
    if (res.ok) {
      setStatusMsg(t("dataRequestSubmitted"));
      router.refresh();
    } else {
      setErrorMsg(t("saveError"));
    }
  };

  const handleCopy = async () => {
    if (!newInviteCode) return;
    try {
      await navigator.clipboard.writeText(newInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
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

      {/* Company Profile */}
      <form
        onSubmit={handleSaveCompany}
        className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4"
      >
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span>{t("companySectionTitle")}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t("companyNameLabel")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t("cityLabel")}</label>
            <Input
              value={cityRegion}
              onChange={(e) => setCityRegion(e.target.value)}
              disabled={!isOwner}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t("legalFormLabel")}</label>
            <Select
              value={legalForm}
              onChange={(e) => setLegalForm(e.target.value as LegalForm)}
              disabled={!isOwner}
            >
              <option value="llc">MCHJ / LLC</option>
              <option value="ie">YaTT / IE</option>
              <option value="jsc">AJ / JSC</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t("fleetSizeLabel")}</label>
            <Select
              value={fleetSize}
              onChange={(e) => setFleetSize(e.target.value as FleetSize)}
              disabled={!isOwner}
            >
              <option value="1-4">1–4</option>
              <option value="5-15">5–15</option>
              <option value="16-30">16–30</option>
              <option value="30+">30+</option>
            </Select>
          </div>
        </div>

        {isOwner ? (
          <Button type="submit" variant="primary" isLoading={savingCompany}>
            {t("saveCompanyButton")}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">{t("ownerOnlyNotice")}</p>
        )}
      </form>

      {/* Team & Dispatcher Invites */}
      <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>{t("teamSectionTitle")}</span>
        </h2>

        {isOwner && (
          <form
            onSubmit={handleInviteDispatcher}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Input
              type="email"
              value={dispatcherEmail}
              onChange={(e) => setDispatcherEmail(e.target.value)}
              placeholder={t("dispatcherEmailPlaceholder")}
              className="flex-1"
            />
            <Button type="submit" variant="outline" isLoading={inviting}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("inviteDispatcherButton")}
            </Button>
          </form>
        )}

        {newInviteCode && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-center justify-between gap-3">
            <code className="font-mono font-bold text-sm">{newInviteCode}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{t("copyInvite")}</span>
            </button>
          </div>
        )}

        <div className="divide-y divide-border/60 rounded-xl border border-border">
          {teamMembers.map((m) => (
            <div
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{m.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {m.role} &middot; {m.phone ?? "—"}
                </p>
              </div>
              {isOwner && m.userId !== currentUserId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await toggleMemberActiveAction(m.userId, !m.isActive);
                    router.refresh();
                  }}
                >
                  {m.isActive ? t("deactivateMember") : t("activateMember")}
                </Button>
              )}
            </div>
          ))}
        </div>

        {invites.filter((i) => i.role === "dispatcher").length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("pendingDispatcherInvites", {
              count: invites.filter((i) => i.role === "dispatcher").length,
            })}
          </p>
        )}
      </div>

      {/* Security: MFA + Change Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold font-heading flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>{t("mfaSectionTitle")}</span>
          </h2>
          <TotpSetupCard alreadyEnrolled={hasTotpFactor} mandatory />
        </div>

        <form
          onSubmit={handlePasswordChange}
          className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-bold font-heading flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span>{t("passwordSectionTitle")}</span>
          </h2>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("currentPasswordPlaceholder")}
            required
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("newPasswordPlaceholder")}
            required
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("confirmPasswordPlaceholder")}
            required
          />
          <Button type="submit" variant="outline" isLoading={changingPw}>
            {t("changePasswordButton")}
          </Button>
        </form>
      </div>

      {/* Privacy & Data Rights */}
      <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold font-heading">{t("privacyTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("privacyDesc")}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDataRequest("export")}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {t("exportDataButton")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDataRequest("delete")}
            className="text-destructive hover:text-destructive border-destructive/40"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("deleteAccountButton")}
          </Button>
        </div>

        {dataRequests.length > 0 && (
          <div className="space-y-1.5 pt-2 text-xs text-muted-foreground">
            {dataRequests.slice(0, 3).map((req) => (
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
