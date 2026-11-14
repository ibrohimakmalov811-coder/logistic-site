"use client";

import * as React from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useTransFlowAuth();

  React.useEffect(() => {
    if (isLoading) return;

    const isSignup = pathname === "/signup";
    const isLogin = pathname === "/login";
    const isCompanyApp = pathname.startsWith("/app/company");
    const isDriverApp = pathname.startsWith("/app/driver");
    const isProtected =
      pathname === "/cabinet" ||
      pathname.startsWith("/cabinet/") ||
      pathname === "/personal-info" ||
      pathname.startsWith("/personal-info/") ||
      pathname === "/onboarding" ||
      pathname.startsWith("/onboarding/") ||
      pathname === "/app" ||
      isCompanyApp ||
      isDriverApp;

    if (!currentUser) {
      if (isProtected) {
        router.replace("/login");
      }
    } else {
      // Authenticated user trying to access login/signup
      if (isSignup || isLogin) {
        if (currentUser.role === "driver") {
          router.replace("/app/driver");
        } else {
          router.replace("/app/company");
        }
        return;
      }

      // Role boundary enforcement
      if (currentUser.role === "driver" && isCompanyApp) {
        router.replace("/app/driver");
        return;
      }

      if ((currentUser.role === "company_owner" || currentUser.role === "dispatcher") && isDriverApp) {
        router.replace("/app/company");
        return;
      }
    }
  }, [currentUser, isLoading, pathname, router]);

  return <>{children}</>;
}
