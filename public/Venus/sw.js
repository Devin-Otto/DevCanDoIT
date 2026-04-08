const CACHE_NAME = "venus-command-center-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      await Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName)));
      await self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkResponsePromise = fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }

          return response;
        })
        .catch(() => cached);

      return networkResponsePromise.then(
        (response) => response ?? cached ?? new Response("Offline", { status: 503, statusText: "Service unavailable" })
      );
    })
  );
});
