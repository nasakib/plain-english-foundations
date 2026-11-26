const CACHE_NAME = 'plain-english-library-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './README.md',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './01_logic_and_reasoning.html',
  './01_logic_and_reasoning.md',
  './02_number_proportion_and_space.html',
  './02_number_proportion_and_space.md',
  './03_matter_energy_and_physics.html',
  './03_matter_energy_and_physics.md',
  './04_life_cells_and_evolution.html',
  './04_life_cells_and_evolution.md',
  './05_computation_information_and_systems.html',
  './05_computation_information_and_systems.md',
  './06_language_economics_and_coordination.html',
  './06_language_economics_and_coordination.md',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' }))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'OFFLINE_READY', cache: CACHE_NAME });
        }
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });

      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkFetch);
        return cached;
      }

      const fresh = await networkFetch;
      if (fresh) return fresh;

      if (request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }

      return new Response('Offline — content not cached.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});
