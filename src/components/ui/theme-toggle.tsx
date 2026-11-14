"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: "h-9 w-9 rounded-xl",
    md: "h-10 w-10 rounded-xl",
  }[size];

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] bg-[#F8FAFC] dark:bg-[#111C30] opacity-50",
          sizeClasses,
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden border transition-all duration-300 active:scale-95",
        "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-blue-300 shadow-sm shadow-blue-500/5",
        "dark:border-[rgba(255,255,255,0.08)] dark:bg-[#111C30] dark:text-[#F8FAFC] dark:hover:bg-[#16223a] dark:hover:border-blue-500/30 dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1220]",
        sizeClasses,
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative h-5 w-5 flex items-center justify-center">
        {/* Sun Icon (Visible in dark mode) */}
        <Sun
          className={cn(
            "h-4 w-4 transition-all duration-500 transform text-amber-400 group-hover:rotate-45 group-hover:scale-110",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0 absolute"
          )}
          aria-hidden="true"
        />

        {/* Moon Icon (Visible in light mode) */}
        <Moon
          className={cn(
            "h-4 w-4 transition-all duration-500 transform text-blue-600 group-hover:-rotate-12 group-hover:scale-110",
            !isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0 absolute"
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
