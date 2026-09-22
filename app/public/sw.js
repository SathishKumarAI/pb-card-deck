const CACHE_NAME = "pb-shuffle-v2";
const PRECACHE = ["/", "/cards.json", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first with cache fallback: always serve fresh data when online,
// fall back to the cached copy only when offline.
//
// Two things are deliberately NOT cached here:
//   - anything cross-origin, which this worker has no business storing;
//   - /_next/static/*, whose filenames already carry a content hash. The
//     browser's own HTTP cache handles those, and copying them in here grew
//     the cache by a full set of chunks on every deploy, for ever, since
//     `activate` only clears OTHER cache versions.
function isCacheable(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return false;
  return true;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // let the browser handle it

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(e.request);
        if (response.ok && isCacheable(url)) cache.put(e.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })
  );
});
