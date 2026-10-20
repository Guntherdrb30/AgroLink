import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isUnsafePreviewDatabase } from "@/lib/security/preview-db-isolation";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/farms(.*)",
  "/livestock(.*)",
  "/operations(.*)",
  "/verification(.*)",
  "/admin/verification(.*)",
  "/onboarding(.*)",
  "/api/blob(.*)",
  "/api/farms/media/sign(.*)",
  "/api/farms/media/stage(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    if (isUnsafePreviewDatabase()) {
      return NextResponse.redirect(new URL("/preview-configuracion", request.url), { status: 307 });
    }
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
