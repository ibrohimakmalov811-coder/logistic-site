"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { syncChannel, VehicleEntity, vehicleRepo, VehicleType } from "@/lib/data";

export default function CompanyVehiclesPage() {
  const { currentCompany } = useTransFlowAuth();
  const t = useTranslations("CompanyPortal.vehicles");

  const [vehicles, setVehicles] = React.useState<VehicleEntity[]>([]);
  const [plateNumber, setPlateNumber] = React.useState("");
  const [vehicleType, setVehicleType] = React.useState<VehicleType>("tent");
  const [capacityKg, setCapacityKg] = React.useState("20000");
  const [isLoading, setIsLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadVehicles = React.useCallback(async () => {
    if (!currentCompany) return;
    try {
      const list = await vehicleRepo.listByCompany(currentCompany.id);
      setVehicles(list);
    } catch (err) {
      console.error("Vehicles load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany]);

  React.useEffect(() => {
    loadVehicles();

    const unsubscribe = syncChannel.subscribe((msg) => {
      if (msg.type === "VEHICLE_ADDED" || msg.type === "STORAGE_RESET") {
        loadVehicles();
      }
    });

    return () => unsubscribe();
  }, [loadVehicles]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setErrorMsg(null);

    const cleanPlate = plateNumber.trim().toUpperCase();
    if (!cleanPlate) {
      setErrorMsg("Davlat raqamini kiriting.");
      return;
    }

    if (vehicles.some((v) => v.plateNumber === cleanPlate)) {
      setErrorMsg(t("duplicatePlateError"));
      return;
    }

    setSubmitting(true);
    try {
      await vehicleRepo.create({
        companyId: currentCompany.id,
        plateNumber: cleanPlate,
        type: vehicleType,
        capacityKg: Number(capacityKg) || 10000,
        status: "active",
      });

      setPlateNumber("");
      await loadVehicles();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Ushbu transport vositasini o'chirishni tasdiqlaysizmi?")) {
      return;
    }
    await vehicleRepo.delete(id);
    await loadVehicles();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Add Vehicle Form */}
      <form
        onSubmit={handleAddVehicle}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs"
      >
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <span>{t("addTitle")}</span>
        </h2>

        {errorMsg && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground">
              Davlat raqami
            </label>
            <Input
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              placeholder="01 A 777 AA"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground">
              Kuzov turi
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="tent">{t("types.tent")}</option>
              <option value="refrigerator">{t("types.refrigerator")}</option>
              <option value="isotherm">Izotermik</option>
              <option value="flatbed">{t("types.flatbed")}</option>
              <option value="container">{t("types.container")}</option>
              <option value="dump">Samosval</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-muted-foreground">
              {"Yuk ko'tarish (kg)"}
            </label>
            <Input
              type="number"
              min={500}
              step={500}
              value={capacityKg}
              onChange={(e) => setCapacityKg(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("addButton")}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Fleet Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">{t("colPlate")}</th>
                <th className="px-4 py-3">{t("colType")}</th>
                <th className="px-4 py-3">{t("colCapacity")}</th>
                <th className="px-4 py-3">{t("colStatus")}</th>
                <th className="px-4 py-3 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    {t("emptyVehicles")}
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {v.plateNumber}
                    </td>
                    <td className="px-4 py-3 capitalize">{v.type}</td>
                    <td className="px-4 py-3">{(v.capacityKg / 1000).toFixed(1)} tonna</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {v.status === "active" ? t("statusAvailable") : v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(v.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title={t("deleteVehicle")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
