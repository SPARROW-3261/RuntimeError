const STATIC_CACHE = "ecoroute-static-v1";
const MAP_CACHE = "ecoroute-map-v1";
const ASSET_CACHE = "ecoroute-assets-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(["/", "/index.html"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, MAP_CACHE, ASSET_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isMapRequest(url) {
  return (
    url.pathname.endsWith(".pbf") ||
    url.pathname.endsWith(".mvt") ||
    url.pathname.endsWith(".pmtiles") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith("/style.json") ||
    url.hostname.includes("openstreetmap.org") ||
    url.hostname.includes("maptiler.com") ||
    url.hostname.includes("mapbox.com") ||
    url.hostname.includes("maplibre.org") ||
    url.hostname.includes("unpkg.com")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (isMapRequest(url)) {
    event.respondWith(
      caches.open(MAP_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);

        return cached || networkPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && (url.origin === self.location.origin)) {
          caches.open(ASSET_CACHE).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
