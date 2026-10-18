"use client";

import { useEffect, useState } from "react";

export function PwaProvider() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let mounted = true;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      // Don't reload forms with unsaved edits. Let the user decide when to
      // load the new version; the new worker serves all requests network-first.
      if (mounted && hadController) setUpdateAvailable(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        // Check at every PWA launch, rather than waiting for the browser's
        // periodic service-worker update cycle.
        await registration.update();
      } catch (error) {
        console.error("Failed to update GanadIA service worker", error);
      }
    };

    void register();
    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm shadow-lg"
    >
      <span>GanadIA tiene una nueva versión disponible.</span>
      <button
        type="button"
        className="shrink-0 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Actualizar
      </button>
    </div>
  );
}
