"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, CheckCircle2, Phone, Save, ShieldCheck, Truck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { companyRepo, VehicleEntity, vehicleRepo } from "@/lib/data";

export default function DriverProfilePage() {
  const { currentUser, currentCompany, driverProfile, refresh } = useTransFlowAuth();
  const t = useTranslations("DriverPortal.profile");

  const [licenseCategory, setLicenseCategory] = React.useState(
    driverProfile?.licenseCategory || "CE"
  );
  const [experienceYears, setExperienceYears] = React.useState(
    String(driverProfile?.experienceYears ?? 5)
  );
  const [assignedVehicle, setAssignedVehicle] = React.useState<VehicleEntity | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (driverProfile) {
      setLicenseCategory(driverProfile.licenseCategory);
      setExperienceYears(String(driverProfile.experienceYears));

      if (driverProfile.vehicleId) {
        vehicleRepo.findById(driverProfile.vehicleId).then(setAssignedVehicle);
      }
    }
  }, [driverProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentCompany) return;
    setIsSaving(true);
    setMessage(null);

    try {
      await companyRepo.saveDriverProfile({
        userId: currentUser.id,
        companyId: currentCompany.id,
        licenseCategory: licenseCategory.trim(),
        experienceYears: Number(experienceYears) || 0,
        vehicleId: driverProfile?.vehicleId || null,
        createdAt: driverProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await refresh();
      setMessage("Haydovchi profili muvaffaqiyatli saqlandi!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading">{t("title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {"Shaxsiy ma'lumotlar va haydovchilik guvohnomasi"}
        </p>
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

      {/* Account Info Box */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-xs">
        <h2 className="text-sm font-bold font-heading flex items-center gap-2 text-foreground">
          <User className="h-4 w-4 text-primary" />
          <span>{"Akkount ma'lumotlari"}</span>
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">F.I.Sh:</span>
            <span className="font-semibold text-foreground">{currentUser?.fullName}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Telefon:</span>
            <span className="font-mono font-medium text-foreground">{currentUser?.phone}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium text-foreground">{currentUser?.email}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-muted-foreground">Biriktirilgan kompaniya:</span>
            <span className="font-semibold text-primary">
              {currentCompany?.name ?? "Kompaniyaga biriktirilmagan"}
            </span>
          </div>
        </div>
      </div>

      {/* Driver License & Details Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs"
      >
        <h2 className="text-sm font-bold font-heading flex items-center gap-2 text-foreground">
          <Truck className="h-4 w-4 text-primary" />
          <span>Haydovchilik toifasi va tajriba</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground">
              Haydovchilik guvohnomasi toifalari
            </label>
            <Input
              value={licenseCategory}
              onChange={(e) => setLicenseCategory(e.target.value.toUpperCase())}
              placeholder="Masalan: B, C, CE"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground">
              Ish tajribasi (yillarda)
            </label>
            <Input
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              required
            />
          </div>
        </div>

        {assignedVehicle && (
          <div className="rounded-xl bg-secondary/40 p-3 text-xs">
            <p className="text-muted-foreground">Sizga biriktirilgan mashina:</p>
            <p className="font-mono font-bold text-foreground mt-0.5">
              {assignedVehicle.plateNumber} ({assignedVehicle.type}) ·{" "}
              {(assignedVehicle.capacityKg / 1000).toFixed(0)} tonna
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button type="submit" size="sm" disabled={isSaving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </form>
    </div>
  );
}
