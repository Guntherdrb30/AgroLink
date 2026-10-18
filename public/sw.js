/*
 * GanadIA online-first PWA.
 *
 * Do not cache HTML, Next.js/RSC responses, Clerk identity endpoints or API
 * responses. A previous cache-first worker pinned the old application shell,
 * making production fixes invisible to installed mobile PWAs.
 *
 * Offline functionality must be reintroduced separately using a carefully
 * scoped, versioned cache strategy that excludes authenticated content.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("agrolynk-shell-"))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// No fetch interception: the active version always comes from the network.
