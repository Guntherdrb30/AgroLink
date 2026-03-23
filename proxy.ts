import { NextResponse } from "next/server";

import { auth } from "@/auth";

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export default auth((request) => {
  const { nextUrl } = request;
  const isLoggedIn = Boolean(request.auth?.user);
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route),
  );
  const isDashboardRoute =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/farms") ||
    nextUrl.pathname.startsWith("/livestock") ||
    nextUrl.pathname.startsWith("/operations") ||
    nextUrl.pathname.startsWith("/verification") ||
    nextUrl.pathname.startsWith("/admin/verification");
  const isPrivateApi = nextUrl.pathname.startsWith("/api/blob");

  if (!isLoggedIn && (isDashboardRoute || isPrivateApi)) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("next", nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/farms/:path*",
    "/livestock/:path*",
    "/operations/:path*",
    "/verification/:path*",
    "/admin/verification/:path*",
    "/api/blob/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
