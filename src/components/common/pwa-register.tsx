"use client";

import * as React from "react";

export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {
          // Non-fatal in dev
        });
      return;
    }

    if (window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal if SW registration fails
      });
    }
  }, []);

  return null;
}
