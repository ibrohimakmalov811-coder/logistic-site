"use client";

import * as React from "react";
import { usePathname } from "@/i18n/routing";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { SkipLink } from "@/components/common/skip-link";
import { RoleSelectorModal } from "@/components/common/role-selector-modal";

interface ChromeSwitcherProps {
  children: React.ReactNode;
}

export function ChromeSwitcher({ children }: ChromeSwitcherProps) {
  const pathname = usePathname();
  const isPortal =
    pathname.startsWith("/app/") ||
    pathname.startsWith("/cabinet") ||
    pathname.startsWith("/personal-info");

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <RoleSelectorModal />
    </>
  );
}
