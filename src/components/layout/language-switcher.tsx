"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Globe, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const languageOptions = [
  { code: "uz", label: "O'zbek", short: "UZ" },
  { code: "en", label: "English", short: "EN" },
  { code: "ru", label: "Русский", short: "RU" },
] as const;

interface LanguageSwitcherProps {
  className?: string;
  align?: "left" | "right";
  placement?: "bottom" | "top";
  onSelect?: () => void;
}

export function LanguageSwitcher({
  className,
  align = "right",
  placement = "bottom",
  onSelect,
}: LanguageSwitcherProps) {
  const currentLocale = useLocale() as "uz" | "ru" | "en";
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLocale = (nextLocale: "uz" | "ru" | "en") => {
    setIsOpen(false);
    onSelect?.();
    const hash = window.location.hash;
    router.replace(`${pathname}${hash}`, { locale: nextLocale });
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
          "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-blue-300 shadow-sm shadow-blue-500/5",
          "dark:border-[rgba(255,255,255,0.08)] dark:bg-[#111C30] dark:text-[#F8FAFC] dark:hover:bg-[#16223a] dark:hover:border-blue-500/30 dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1220]"
        )}
      >
        <Globe
          className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#60A5FA]"
          aria-hidden="true"
        />
        <span>{currentLocale}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-[#64748B] dark:text-[#94A3B8] transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Languages"
          className={cn(
            "absolute z-50 w-36 rounded-2xl border p-1.5 focus:outline-none transition-all duration-150",
            placement === "top" ? "bottom-full mb-2" : "mt-2",
            align === "right" ? "right-0" : "left-0",
            "border-[#E2E8F0] bg-white shadow-xl shadow-slate-900/15",
            "dark:border-[rgba(255,255,255,0.12)] dark:bg-[#111C30] dark:shadow-[0_12px_32px_rgba(0,0,0,0.65)]"
          )}
        >
          {languageOptions.map((loc) => {
            const isSelected = loc.code === currentLocale;
            return (
              <li key={loc.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelectLocale(loc.code)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors duration-150",
                    isSelected
                      ? "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA] font-semibold"
                      : "text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[rgba(255,255,255,0.06)]"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span>{loc.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                      {loc.short}
                    </span>
                    {isSelected && (
                      <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
