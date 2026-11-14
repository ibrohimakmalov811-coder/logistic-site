"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus, Ticket, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createInviteAction,
  revokeInviteAction,
  toggleMemberActiveAction,
} from "@/actions/company";
import type { CompanyDriverListItem } from "@/lib/portal-service";
import type { InviteRow } from "@/types/database";

interface CompanyDriversViewProps {
  drivers: CompanyDriverListItem[];
  invites: InviteRow[];
}

export function CompanyDriversView({
  drivers,
  invites,
}: CompanyDriversViewProps) {
  const t = useTranslations("CompanyPortal.drivers");
  const format = useFormatter();
  const router = useRouter();

  const [invitedEmail, setInvitedEmail] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setGeneratedCode(null);
    try {
      const res = await createInviteAction({
        role: "driver",
        invitedEmail: invitedEmail.trim() || undefined,
      });
      if (res.ok && res.inviteCode) {
        setGeneratedCode(res.inviteCode);
        setInvitedEmail("");
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleRevoke = async (id: string) => {
    setBusyId(id);
    try {
      await revokeInviteAction(id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (userId: string, nextActive: boolean) => {
    setBusyId(userId);
    try {
      await toggleMemberActiveAction(userId, nextActive);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Invite Driver Box */}
      <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading">{t("inviteTitle")}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t("inviteDesc")}</p>
          </div>
        </div>

        <form onSubmit={handleGenerateInvite} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            value={invitedEmail}
            onChange={(e) => setInvitedEmail(e.target.value)}
            placeholder={t("inviteEmailPlaceholder")}
            className="flex-1"
          />
          <Button type="submit" variant="primary" isLoading={creating}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("generateInviteButton")}
          </Button>
        </form>

        {generatedCode && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {t("inviteOnceWarning")}
            </p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5">
              <code className="text-base font-mono font-bold tracking-wider text-foreground">
                {generatedCode}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? t("copied") : t("copyCode")}</span>
              </button>
            </div>
          </div>
        )}

        {invites.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("pendingInvitesTitle")}
            </p>
            <div className="divide-y divide-border/60 rounded-xl border border-border">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                >
                  <div>
                    <code className="font-mono font-semibold text-foreground">
                      {inv.code_hint}
                    </code>
                    {inv.invited_email && (
                      <span className="ml-2 text-muted-foreground">
                        &middot; {inv.invited_email}
                      </span>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {t("expiresAt")}:{" "}
                      {format.dateTime(new Date(inv.expires_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busyId === inv.id}
                    onClick={() => handleRevoke(inv.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drivers List */}
      <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6">
        <h2 className="text-base font-bold font-heading mb-4">
          {t("driversListTitle", { count: drivers.length })}
        </h2>

        {drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("emptyDrivers")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">{t("colName")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colPhone")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colLicenses")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colStatus")}</th>
                  <th className="pb-3 font-medium text-right">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {drivers.map((drv) => (
                  <tr key={drv.userId}>
                    <td className="py-3.5 pr-4 font-medium text-foreground">
                      {drv.fullName}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                      {drv.phone ?? "—"}
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      {drv.licenseCategory || "—"}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          drv.isActive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {drv.isActive ? t("statusActive") : t("statusInactive")}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busyId === drv.userId}
                        onClick={() =>
                          handleToggleActive(drv.userId, !drv.isActive)
                        }
                      >
                        {drv.isActive ? (
                          <>
                            <UserX className="mr-1.5 h-3.5 w-3.5" />
                            {t("deactivateButton")}
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                            {t("activateButton")}
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
