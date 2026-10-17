import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
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
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    if (isUnsafePreviewDatabase()) {
      return Response.json(
        { error: "PREVIEW_DATABASE_NOT_ISOLATED", message: "Entorno de pruebas pendiente de configuración segura." },
        { status: 503 },
      );
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
