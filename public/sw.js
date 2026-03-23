self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("agrolynk-shell-v1").then((cache) => {
      return cache.addAll(["/", "/manifest.webmanifest"]);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => caches.match("/") || Response.error())
      );
    }),
  );
});
