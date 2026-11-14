"use client";

import * as React from "react";

export function RouteLinesBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-30 dark:opacity-20 select-none"
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="routeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="routeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Major Transit Corridor 1: Tashkent - Samarkand - Bukhara */}
        <path
          d="M 120 220 Q 420 180 680 340 T 1280 480"
          stroke="url(#routeGrad1)"
          strokeWidth="2"
          strokeDasharray="6 8"
        />

        {/* Major Transit Corridor 2: Fergana Valley Cross-Route */}
        <path
          d="M 240 680 Q 560 520 860 620 T 1380 320"
          stroke="url(#routeGrad2)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* Ambient Logistics Nodes (Tashkent, Samarkand, Andijan, Urgench) */}
        <circle cx="680" cy="340" r="8" fill="#3b82f6" opacity="0.2" />
        <circle cx="680" cy="340" r="3" fill="#3b82f6" />
        <circle cx="1280" cy="480" r="3" fill="#f59e0b" />
        <circle cx="240" cy="680" r="3" fill="#10b981" />
        <circle cx="860" cy="620" r="4" fill="#3b82f6" opacity="0.7" />
      </svg>
    </div>
  );
}
