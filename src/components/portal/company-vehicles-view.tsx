"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createVehicleAction, deleteVehicleAction } from "@/actions/company";
import type { VehicleRow, VehicleStatus, VehicleType } from "@/types/database";

interface CompanyVehiclesViewProps {
  vehicles: VehicleRow[];
}

export function CompanyVehiclesView({ vehicles }: CompanyVehiclesViewProps) {
  const t = useTranslations("CompanyPortal.vehicles");
  const format = useFormatter();
  const router = useRouter();

  const [plateNumber, setPlateNumber] = React.useState("");
  const [vehicleType, setVehicleType] = React.useState<VehicleType>("tent");
  const [region, setRegion] = React.useState("Toshkent");
  const [capacityKg, setCapacityKg] = React.useState("10000");
  const [status, setStatus] = React.useState<VehicleStatus>("available");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await createVehicleAction({
        plateNumber,
        vehicleType,
        region,
        capacityKg: Number(capacityKg),
        status,
      });
      if (!res.ok) {
        setErrorMsg(
          res.errorCode === "DUPLICATE_PLATE"
            ? t("duplicatePlateError")
            : t("saveError")
        );
        return;
      }
      setPlateNumber("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteVehicleAction(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 space-y-4"
      >
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <span>{t("addTitle")}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="01 A 123 AA"
            required
          />
          <Select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
          >
            <option value="tent">{t("types.tent")}</option>
            <option value="refrigerator">{t("types.refrigerator")}</option>
            <option value="flatbed">{t("types.flatbed")}</option>
            <option value="container">{t("types.container")}</option>
            <option value="van">{t("types.van")}</option>
            <option value="other">{t("types.other")}</option>
          </Select>
          <Input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t("regionPlaceholder")}
            required
          />
          <Input
            type="number"
            step="100"
            min="500"
            max="120000"
            value={capacityKg}
            onChange={(e) => setCapacityKg(e.target.value)}
            placeholder={t("capacityPlaceholder")}
            required
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as VehicleStatus)}
          >
            <option value="available">{t("statuses.available")}</option>
            <option value="on_trip">{t("statuses.on_trip")}</option>
            <option value="maintenance">{t("statuses.maintenance")}</option>
            <option value="inactive">{t("statuses.inactive")}</option>
          </Select>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Button type="submit" variant="primary" isLoading={submitting}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addButton")}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6">
        <h2 className="text-base font-bold font-heading mb-4">
          {t("listTitle", { count: vehicles.length })}
        </h2>

        {vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("emptyVehicles")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">{t("colPlate")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colRegion")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colType")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colCapacity")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("colStatus")}</th>
                  <th className="pb-3 font-medium text-right">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="py-3.5 pr-4 font-mono text-xs font-bold">
                      {v.plate_number}
                    </td>
                    <td className="py-3.5 pr-4 font-medium">{v.region}</td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                      {t(`types.${v.vehicle_type}`)}
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      {format.number(v.capacity_kg)} kg
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 font-semibold ${
                          v.status === "available"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : v.status === "on_trip"
                              ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                              : v.status === "maintenance"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                                : "bg-slate-500/15 text-slate-500"
                        }`}
                      >
                        {t(`statuses.${v.status}`)}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === v.id}
                        onClick={() => handleDelete(v.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
