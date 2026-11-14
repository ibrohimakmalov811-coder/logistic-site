"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { DriverShell } from "@/components/portal/driver-shell";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, currentCompany, isLoading } = useTransFlowAuth();

  React.useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else if (currentUser.role !== "driver") {
        router.replace("/app/company");
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser || currentUser.role !== "driver") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DriverShell
      companyName={currentCompany?.name ?? null}
      driverName={currentUser.fullName}
      isDevSandbox={true}
    >
      {children}
    </DriverShell>
  );
}
