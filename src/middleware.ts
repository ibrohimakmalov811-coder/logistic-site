import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { AUTH_COOKIE_NAME } from "./lib/storage-auth";

const handleI18n = createIntlMiddleware(routing);

function parseLocalizedPath(pathname: string): {
  locale: string;
  subPath: string;
} {
  const match = pathname.match(/^\/(uz|ru|en)(\/.*)?$/);
  if (match) {
    return {
      locale: match[1],
      subPath: match[2] || "/",
    };
  }
  return {
    locale: routing.defaultLocale,
    subPath: pathname,
  };
}

function redirectWithHeaders(
  targetUrl: URL,
  securityHeaders: Record<string, string>
): NextResponse {
  const redirectRes = NextResponse.redirect(targetUrl);
  Object.entries(securityHeaders).forEach(([k, v]) => {
    redirectRes.headers.set(k, v);
  });
  return redirectRes;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept static assets, manifest, robots, sitemap, or api/auth callbacks
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/auth/callback")
  ) {
    return NextResponse.next();
  }

  // 1. Generate a per-request cryptographic nonce for strict CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // 2. Clone request headers and attach nonce for SSR Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // 3. Define strict Content-Security-Policy (CSP)
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}' https://challenges.cloudflare.com`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https://challenges.cloudflare.com;
    frame-src 'self' https://challenges.cloudflare.com;
    worker-src 'self';
    manifest-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDev ? "" : "upgrade-insecure-requests;"}
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  requestHeaders.set("content-security-policy", cspHeader);

  const securityHeaders: Record<string, string> = {
    "Content-Security-Policy": cspHeader,
    ...(isDev
      ? {}
      : { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" }),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };

  // 4. Delegate to next-intl for localized routing negotiation
  const modifiedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
  });

  const response = handleI18n(modifiedRequest);

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // 5. Auth & Protected Route Enforcement:
  // - Public routes (Home page `/`, `/privacy`, `/terms`, `/signup`, `/login`) are open to visitors.
  // - Protected routes (`/cabinet`, `/personal-info`, `/app/*`) require authentication.
  //   Unauthenticated visitors attempting to access protected routes are redirected to Register (`/${locale}/signup`).
  // - Authenticated users visiting `/signup` or `/login` are redirected to Cabinet (`/${locale}/cabinet`).
  const { locale, subPath } = parseLocalizedPath(pathname);
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(authCookie);

  const isSignup = subPath === "/signup";
  const isLogin = subPath === "/login";
  const isProtected =
    subPath === "/cabinet" ||
    subPath.startsWith("/cabinet/") ||
    subPath === "/personal-info" ||
    subPath.startsWith("/personal-info/") ||
    subPath === "/app" ||
    subPath.startsWith("/app/");

  if (!isAuthenticated && isProtected) {
    const signupUrl = new URL(`/${locale}/signup`, request.url);
    return redirectWithHeaders(signupUrl, securityHeaders);
  }

  if (isAuthenticated && (isSignup || isLogin)) {
    const cabinetUrl = new URL(`/${locale}/cabinet`, request.url);
    return redirectWithHeaders(cabinetUrl, securityHeaders);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
