/* ApnaQuran PWA service worker.
 * Quran text API responses are cached only after a successful online response.
 * Prayer times, AI, subscriptions and recitation streams are never cached.
 */
const CACHE_VERSION = 'apnaquran-pwa-v3';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

const PRECACHE_URLS = [
  '/', '/index.html', '/read.html', '/surah.html', '/listen.html',
  '/prayer-times.html', '/qibla.html', '/names.html', '/duas.html',
  '/calendar.html', '/events.html', '/sunnah.html',
  '/offline.html', '/site.webmanifest',
  '/favicon.ico', '/favicon-32x32.png', '/apple-touch-icon.png',
  '/img/icons/icon-192.png', '/img/icons/icon-512.png',
  '/img/prophet-mosque.jpg', '/img/kaaba.jpg', '/img/open-quran.svg',
  '/css/style.css', '/css/home.css', '/css/content.css',
  '/css/read-modern.css', '/css/listen.css', '/css/listen-modern.css',
  '/css/prayer.css', '/css/qibla.css', '/css/names-modern.css',
  '/css/resources.css', '/css/sunnah.css', '/css/talking-assistant.css',
  '/js/app.js', '/js/home.js', '/js/read.js', '/js/surah.js',
  '/js/listen.js', '/js/location.js', '/js/prayer.js', '/js/qibla.js',
  '/js/names.js', '/js/duas.js', '/js/calendar.js', '/js/events.js',
  '/js/sunnah.js', '/js/talking-assistant.js',
  '/js/adhan-local.js', '/js/hijri-location.js',
  '/js/footer.js', '/js/footer-subscribe.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // A missing optional asset must not prevent the worker from installing.
    await Promise.all(PRECACHE_URLS.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok && response.type === 'basic') {
          await cache.put(path, response);
        }
      } catch (_) {
        // The page can still be cached on its first successful visit.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('apnaquran-pwa-') &&
        key !== SHELL_CACHE && key !== RUNTIME_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isQuranTextApi(url) {
  if (url.origin !== 'https://api.alquran.cloud') return false;
  if (url.searchParams.has('audio')) return false;
  const path = url.pathname;
  return path === '/v1/surah' ||
    /^\/v1\/surah\/\d+\/editions\/[^/]+$/.test(path) ||
    /^\/v1\/ayah\/[^/]+\/[^/]+$/.test(path);
}

async function networkFirstQuran(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json') &&
        response.type === 'cors') {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      if (keys.length > 120) await cache.delete(keys[0]);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Quran text/translations only: live network first, saved copy if offline.
  if (isQuranTextApi(url)) {
    event.respondWith(networkFirstQuran(request));
    return;
  }

  // Never intercept third-party APIs, audio streams, or publisher/admin pages.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/weekly-verse.html' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('/functions/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && url.pathname !== '/weekly-verse.html') {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(request)) ||
          (await cache.match(url.pathname)) ||
          (await cache.match('/offline.html')) ||
          new Response('You are offline. Please reconnect and try again.', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  // Same-origin static assets: network first so published updates appear promptly,
  // with the previously saved response used when the device is offline.
  if (/\.(?:css|js|png|jpg|jpeg|svg|webp|ico|webmanifest|woff2?)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await cache.match(request)) ||
          (await cache.match(url.pathname)) ||
          new Response('', { status: 504 });
      }
    })());
  }
});
