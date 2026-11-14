"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, CheckCircle2, KeyRound, Loader2, Truck, UserCheck } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import {
  companyRepo,
  inviteRepo,
  userRepo,
} from "@/lib/data";

export default function OnboardingPage() {
  const router = useRouter();
  const { currentUser, currentCompany, driverProfile, refresh } = useTransFlowAuth();
  const t = useTranslations("Onboarding");

  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = React.useState("");
  const [city, setCity] = React.useState("Toshkent");
  const [fleetSize, setFleetSize] = React.useState("10-25");
  const [inviteCode, setInviteCode] = React.useState("");
  const [licenseCategory, setLicenseCategory] = React.useState("CE");
  const [experienceYears, setExperienceYears] = React.useState("5");

  React.useEffect(() => {
    if (currentCompany) {
      setCompanyName(currentCompany.name);
      setCity(currentCompany.city);
    }
  }, [currentCompany]);

  if (!currentUser) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  const role = currentUser.role;

  const handleFinish = async () => {
    await userRepo.update(currentUser.id, { onboardingCompleted: true });
    await refresh();
    if (role === "driver") {
      router.push("/app/driver");
    } else {
      router.push("/app/company");
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim().length < 2) {
      setErrorMsg("Kompaniya nomini kiriting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (currentCompany) {
        await companyRepo.update(currentCompany.id, {
          name: companyName.trim(),
          city: city.trim(),
          fleetSize,
        });
      } else {
        await companyRepo.create(currentUser.id, companyName.trim(), city.trim(), fleetSize);
      }
      await refresh();
      setStep(2);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (inviteCode.trim()) {
        const res = await inviteRepo.verifyAndRedeemInvite(inviteCode.trim(), currentUser.id, role);
        if (!res.success) {
          setErrorMsg(res.error || "Taklif kodi noto'g'ri.");
          return;
        }
        await refresh();
      }

      if (role === "driver") {
        setStep(2); // driver license step
      } else {
        await handleFinish();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDriverDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) {
      setErrorMsg("Avval kompaniya taklif kodini kiritishingiz kerak.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await companyRepo.saveDriverProfile({
        userId: currentUser.id,
        companyId: currentCompany.id,
        licenseCategory: licenseCategory.trim().toUpperCase(),
        experienceYears: Number(experienceYears) || 0,
        vehicleId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await handleFinish();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 text-card-foreground shadow-xl">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {role === "company_owner"
              ? "Kompaniya egasi"
              : role === "dispatcher"
                ? "Dispetcher"
                : "Haydovchi"}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold font-heading mt-2">
            Xush kelibsiz, {currentUser.fullName}!
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Profilingizni sozlash uchun bir necha oddiy qadamlarni bajaring.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Company Owner Flow */}
        {role === "company_owner" && (
          <div>
            {step === 1 && (
              <form onSubmit={handleCompanySubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Kompaniya nomi
                  </label>
                  <Input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Masalan: Silk Road Trans Logistics"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Shahar / Viloyat
                  </label>
                  <Input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Toshkent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Avtopark hajmi
                  </label>
                  <select
                    value={fleetSize}
                    onChange={(e) => setFleetSize(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="1-5">1-5 ta mashina</option>
                    <option value="5-10">5-10 ta mashina</option>
                    <option value="10-25">10-25 ta mashina</option>
                    <option value="25+">25+ ta mashina</option>
                  </select>
                </div>

                <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Davom etish"
                  )}
                </Button>
              </form>
            )}

            {step === 2 && (
              <div className="text-center space-y-4 py-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-lg font-bold font-heading">Kompaniya tayyor!</h2>
                <p className="text-xs text-muted-foreground">
                  {"Boshqaruv paneliga o'ting va o'z haydovchilaringizni taklif qilishni boshlang."}
                </p>
                <Button onClick={handleFinish} className="w-full">
                  {"Boshqaruv paneliga o'tish"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Driver or Dispatcher Flow */}
        {(role === "driver" || role === "dispatcher") && (
          <div>
            {step === 1 && (
              <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
                {currentCompany ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center">
                    <p className="text-xs text-muted-foreground">Biriktirilgan kompaniya:</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {currentCompany.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-primary" />
                      Kompaniya taklif kodi
                    </label>
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABCD-2K7M"
                      className="font-mono text-sm tracking-wider"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Kompaniya dispetcheridan olingan 8 xonali taklif kodini kiriting.
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Davom etish"
                  )}
                </Button>
              </form>
            )}

            {step === 2 && role === "driver" && (
              <form onSubmit={handleDriverDetailsSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Haydovchilik guvohnomasi toifalari
                  </label>
                  <Input
                    required
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value.toUpperCase())}
                    placeholder="B, C, CE"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Haydovchilik tajribasi (yillarda)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Tugatish va profilga o'tish"
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
