"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, showText = true, size = "md" }: BrandLogoProps) {
  const sizeClasses = {
    sm: {
      img: "h-7 w-auto shrink-0",
      text: "text-base sm:text-lg",
    },
    md: {
      img: "h-8 sm:h-9 xl:h-11 w-auto shrink-0",
      text: "text-lg sm:text-xl xl:text-2xl",
    },
    lg: {
      img: "h-12 w-auto shrink-0",
      text: "text-2xl sm:text-3xl",
    },
  }[size];

  return (
    <div
      className={cn(
        "group flex items-center gap-2 sm:gap-2.5 xl:gap-3 transition-transform duration-300 hover:scale-[1.02]",
        className
      )}
    >
      {/* Dynamic Semi-Truck Graphic with Speed Trails */}
      <div className="relative flex items-center justify-center shrink-0">
        {/* Ambient blue glow on hover */}
        <div
          className="absolute -inset-1 rounded-full bg-[#3B82F6]/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
        />

        <div className="relative overflow-visible transition-transform duration-300 group-hover:translate-x-0.5">
          <Image
            src="/images/transflow-truck.png"
            alt="TransFlow Semi-Truck Logo"
            width={240}
            height={105}
            priority
            className={cn(
              "object-contain transition-all duration-300",
              "drop-shadow-[0_2px_6px_rgba(15,23,42,0.22)] contrast-[1.05]",
              "dark:contrast-100 dark:drop-shadow-[0_4px_14px_rgba(59,130,246,0.45)]",
              sizeClasses.img
            )}
          />
        </div>
      </div>

      {/* Styled Wordmark: Trans (Adaptive) + Flow (Electric Blue) */}
      {showText && (
        <div className="flex flex-col select-none leading-none whitespace-nowrap">
          <span
            className={cn(
              "font-heading font-black tracking-tight flex items-baseline",
              sizeClasses.text
            )}
          >
            <span className="text-[#0F172A] dark:text-[#F8FAFC] tracking-tight transition-colors duration-300">
              Trans
            </span>
            <span className="bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-sky-500 dark:from-[#60A5FA] dark:via-[#3B82F6] dark:to-cyan-400 bg-clip-text text-transparent italic font-black pl-0.5 drop-shadow-[0_1px_2px_rgba(37,99,235,0.25)] transition-all duration-300">
              Flow
            </span>
          </span>
          <span className="text-[9px] xl:text-[10px] font-semibold tracking-widest uppercase text-[#64748B] dark:text-[#94A3B8] mt-0.5 hidden sm:block transition-colors duration-300">
            Logistics Platform
          </span>
        </div>
      )}
    </div>
  );
}
