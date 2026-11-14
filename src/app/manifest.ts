import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — Logistics & Driver Portal`,
    short_name: siteConfig.name,
    description:
      "Dispatching, fleet management, and driver delivery confirmation platform for logistics companies in Uzbekistan.",
    start_url: "/uz/app/driver",
    scope: "/",
    display: "standalone",
    background_color: "#0B1220",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/brand-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
