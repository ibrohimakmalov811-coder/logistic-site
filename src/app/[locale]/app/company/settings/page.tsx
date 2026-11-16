"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, CheckCircle2, Copy, Download, RefreshCw, Save, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { companyRepo, exportSnapshotJson, resetAllData, seedDemoData, syncChannel } from "@/lib/data";

export default function CompanySettingsPage() {
  const { currentUser, currentCompany, refresh } = useTransFlowAuth();
  const t = useTranslations("CompanyPortal.settings");

  const [name, setName] = React.useState(currentCompany?.name || "");
  const [city, setCity] = React.useState(currentCompany?.city || "");
  const [fleetSize, setFleetSize] = React.useState(currentCompany?.fleetSize || "10-25");
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name);
      setCity(currentCompany.city);
      setFleetSize(currentCompany.fleetSize || "10-25");
    }
  }, [currentCompany]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setIsSaving(true);
    setMessage(null);

    try {
      await companyRepo.update(currentCompany.id, {
        name: name.trim(),
        city: city.trim(),
        fleetSize,
      });
      await refresh();
      setMessage("Kompaniya ma'lumotlari muvaffaqiyatli saqlandi!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const json = exportSnapshotJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transflow_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = async () => {
    if (!window.confirm("Barcha ma'lumotlar tozalanadi va boshlang'ich demo holatiga qaytariladi. Davom etasizmi?")) {
      return;
    }
    await seedDemoData();
    syncChannel.broadcast("STORAGE_RESET");
    await refresh();
    setMessage("Barcha demo ma'lumotlar qayta tiklandi.");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Company Profile Settings Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs"
      >
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span>{t("companyProfileTitle")}</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground">
              {t("companyNameLabel")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={currentUser?.role !== "company_owner"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                {t("cityLabel")}
              </label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                disabled={currentUser?.role !== "company_owner"}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                {t("fleetSizeLabel")}
              </label>
              <select
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value)}
                disabled={currentUser?.role !== "company_owner"}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="1-5">1-5 ta fura</option>
                <option value="5-10">5-10 ta fura</option>
                <option value="10-25">10-25 ta fura</option>
                <option value="25+">25+ ta fura</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                {t("inviteCodeLabel")}
              </label>
              <div className="flex gap-2">
                <Input
                  value={currentCompany?.inviteCode || "TF-8801A"}
                  readOnly
                  className="font-mono bg-muted/40 font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    navigator.clipboard.writeText(currentCompany?.inviteCode || "");
                    setMessage("Kompaniya taklif kodi nusxalandi!");
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  title={t("copyCode")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {currentUser?.role === "company_owner" && (
          <div className="flex justify-end pt-2 border-t border-border">
            <Button type="submit" size="sm" disabled={isSaving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isSaving ? "Saqlanmoqda..." : t("saveProfileButton")}
            </Button>
          </div>
        )}
      </form>

      {/* Demo Maintenance & Data Controls */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-500" />
          <span>Demo boshqaruvi va zaxira nusxa</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          {"Barcha ma'lumotlar lokal brauzer xotirasida (localStorage/IndexedDB) saqlanadi. Ma'lumotlarni JSON fayl sifatida eksport qilishingiz yoki demo holatiga qaytarishingiz mumkin."}
        </p>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" />
            {"Ma'lumotlarni eksport qilish (JSON)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetData}
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className="h-4 w-4" />
            Demo holatiga qaytarish
          </Button>
        </div>
      </div>
    </div>
  );
}
