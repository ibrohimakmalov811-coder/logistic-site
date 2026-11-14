"use client";

import * as React from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (error: unknown) => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: unknown) => void;
  onExpire?: () => void;
  theme?: "auto" | "light" | "dark";
  nonce?: string;
}

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  nonce,
}: TurnstileProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [devSimulated, setDevSimulated] = React.useState(false);

  const isDev = process.env.NODE_ENV === "development";

  const renderWidget = React.useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    try {
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onVerify(token);
        },
        "error-callback": (err) => {
          onError?.(err);
        },
        "expired-callback": () => {
          onExpire?.();
        },
        theme,
      });
    } catch (e) {
      console.warn("[Turnstile render error]", e);
    }
  }, [siteKey, onVerify, onError, onExpire, theme]);

  React.useEffect(() => {
    if (scriptLoaded && window.turnstile) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [scriptLoaded, renderWidget]);

  return (
    <div className="my-2 min-h-[65px] flex flex-col items-center justify-center">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        nonce={nonce}
        onLoad={() => {
          setScriptLoaded(true);
        }}
        onError={(err) => {
          console.warn("[Turnstile Script Load Error]", err);
          if (isDev) {
            setScriptLoaded(true);
          }
        }}
      />
      <div ref={containerRef} className="cf-turnstile" />

      {/* Development fallback simulator helper */}
      {isDev && (
        <div className="mt-1 text-center">
          <button
            type="button"
            onClick={() => {
              setDevSimulated(true);
              onVerify("XXXX.DUMMY.DEV.TOKEN.PASSES");
            }}
            className="text-xs text-muted-foreground hover:text-primary underline"
          >
            {devSimulated
              ? "✓ Dev Turnstile Token Active"
              : "Dev: Click to test pass bot challenge"}
          </button>
        </div>
      )}
    </div>
  );
}
