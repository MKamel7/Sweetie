// Offline support. Bump VERSION whenever you change any file so her phone picks up the update.
const VERSION = 'v10';
const CACHE = `sweetie-${VERSION}`;
const ASSETS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/app.js', 'js/config.js', 'js/timelock.js', 'js/fx.js', 'js/candles.js', 'js/sprites.js',
  'js/sealed.js', 'js/unseal.js', 'js/vendor/tlock.js',
  'img/envelope.png', 'img/cat_heart.gif', 'img/cat_dance.gif',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first (so edits you push reach her), cache as offline fallback.
// Only GET is handled; the HEAD request used for the trusted clock always hits the network.
self.addEventListener('fetch', (e) => {
  // Only this site's own files. drand beacons and fonts go straight to the network.
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});

// Tapping a reminder opens (or focuses) the app.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => 'focus' in w);
      return win ? win.focus() : self.clients.openWindow('./');
    }),
  );
});
