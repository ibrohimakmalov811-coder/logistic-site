"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { CompanyShell } from "@/components/portal/company-shell";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";

interface CompanyLayoutProps {
  children: React.ReactNode;
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const router = useRouter();
  const { currentUser, currentCompany, isLoading } = useTransFlowAuth();

  React.useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else if (currentUser.role === "driver") {
        router.replace("/app/driver");
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser || currentUser.role === "driver") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CompanyShell
      companyName={currentCompany?.name ?? "TransFlow Logistics"}
      userName={currentUser.fullName}
      role={currentUser.role}
      isDevSandbox={true}
    >
      {children}
    </CompanyShell>
  );
}
