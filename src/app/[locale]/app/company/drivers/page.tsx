"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Phone,
  Plus,
  ShieldCheck,
  Ticket,
  Trash2,
  Truck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import {
  companyRepo,
  DriverProfileEntity,
  inviteRepo,
  syncChannel,
  UserEntity,
  VehicleEntity,
  vehicleRepo,
} from "@/lib/data";
import { CompanyInvitesView } from "@/components/portal/company-invites-view";

interface EnrichedDriver {
  user: UserEntity;
  profile: DriverProfileEntity | null;
  vehicle: VehicleEntity | null;
  isActive: boolean;
}

export default function CompanyDriversPage() {
  const { currentUser, currentCompany } = useTransFlowAuth();
  const t = useTranslations("CompanyPortal.drivers");

  const [drivers, setDrivers] = React.useState<EnrichedDriver[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    if (!currentCompany) return;
    try {
      const [members, vehicles] = await Promise.all([
        companyRepo.getMembers(currentCompany.id),
        vehicleRepo.listByCompany(currentCompany.id),
      ]);

      const driverMembers = members.filter((m) => m.role === "driver");

      const enriched: EnrichedDriver[] = await Promise.all(
        driverMembers.map(async (m) => {
          const profile = await companyRepo.getDriverProfile(m.user.id);
          const vehicle = profile?.vehicleId
            ? vehicles.find((v) => v.id === profile.vehicleId) || null
            : null;
          return {
            user: m.user,
            profile,
            vehicle,
            isActive: m.isActive,
          };
        })
      );

      setDrivers(enriched);
    } catch (err) {
      console.error("Drivers load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany]);

  React.useEffect(() => {
    loadData();

    const unsubscribe = syncChannel.subscribe((msg) => {
      if (
        msg.type === "INVITE_REDEEMED" ||
        msg.type === "STORAGE_RESET" ||
        msg.type === "VEHICLE_ADDED"
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    if (!currentCompany) return;
    if (currentActive) {
      await companyRepo.removeMember(currentCompany.id, userId);
    } else {
      await companyRepo.addMember(currentCompany.id, userId, "driver");
    }
    await loadData();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Invites Management Section */}
      {currentCompany && currentUser && (
        <CompanyInvitesView
          companyId={currentCompany.id}
          createdByUserId={currentUser.id}
        />
      )}

      {/* Drivers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold font-heading flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>Kompaniya haydovchilari ({drivers.length})</span>
          </h2>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t("colName")}</th>
                  <th className="px-4 py-3">{t("colPhone")}</th>
                  <th className="px-4 py-3">{t("colLicenses")}</th>
                  <th className="px-4 py-3">Biriktirilgan transport</th>
                  <th className="px-4 py-3">{t("colStatus")}</th>
                  <th className="px-4 py-3 text-right">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      {t("emptyDrivers")}
                    </td>
                  </tr>
                ) : (
                  drivers.map(({ user, profile, vehicle, isActive }) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{user.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <a
                          href={`tel:${user.phone}`}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {profile?.licenseCategory || "B, C, CE"}
                        </span>
                        {profile?.experienceYears ? (
                          <span className="text-muted-foreground text-[11px] ml-1">
                            ({profile.experienceYears} yil staj)
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {vehicle ? (
                          <div className="font-mono font-medium text-foreground">
                            {vehicle.plateNumber} ({vehicle.type})
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            Biriktirilmagan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-3 w-3" />
                            {t("statusActive")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            <UserX className="h-3 w-3" />
                            {t("statusInactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user.id, isActive)}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isActive ? t("deactivateButton") : t("activateButton")}
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
    </div>
  );
}
