const CACHE_NAME = 'plain-english-library-v4';

const PRECACHE_URLS = [
  './',
  './index.html',
  './404.html',
  './manifest.webmanifest',
  './README.md',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './01_body_and_physical_health.html',
  './01_body_and_physical_health.md',
  './02_feelings_and_emotional_health.html',
  './02_feelings_and_emotional_health.md',
  './03_people_empathy_and_connection.html',
  './03_people_empathy_and_connection.md',
  './04_clear_thinking_and_truth.html',
  './04_clear_thinking_and_truth.md',
  './05_numbers_size_and_patterns.html',
  './05_numbers_size_and_patterns.md',
  './06_things_motion_and_energy.html',
  './06_things_motion_and_energy.md',
  './07_living_things_and_nature.html',
  './07_living_things_and_nature.md',
  './08_messages_systems_and_community.html',
  './08_messages_systems_and_community.md',
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
