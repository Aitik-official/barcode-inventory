import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ZAA_COOKIE = "zaa_admin";

// Protected app routes
const PROTECTED_PREFIXES = [
  "/products",
  "/barcodes",
  "/scan",
  "/inventory",
  "/orders",
  "/partners",
  "/marketplaces",
  "/users",
  "/reports",
  "/guide",
  "/website",
  "/zaa/dashboard",
];

function isSessionValid(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  if (cookieValue === "ok") return true;

  try {
    // Base64url decode
    const base64 = cookieValue.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);

    if (!payload || !payload.expiresAt) return false;
    // Check if 12-hour session has expired
    return Date.now() < payload.expiresAt;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get(ZAA_COOKIE)?.value;
  const authenticated = isSessionValid(cookie);

  // 1. Root "/" path: If unauthenticated, redirect directly to /login
  if (pathname === "/") {
    if (!authenticated) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    const productsUrl = new URL("/products", request.url);
    return NextResponse.redirect(productsUrl);
  }

  // 2. /login path: If already authenticated, redirect to /products
  if (pathname === "/login") {
    if (authenticated) {
      const productsUrl = new URL("/products", request.url);
      return NextResponse.redirect(productsUrl);
    }
    return NextResponse.next();
  }

  // 3. Check protected routes
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtected && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (/api/*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
