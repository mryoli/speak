// Speak — service worker : coquille hors-ligne.
// L'app a besoin du réseau pour parler à Gemini, mais l'interface
// se charge instantanément et reste installable.
const CACHE = 'speak-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Ne jamais mettre en cache les appels à l'API Gemini.
  if (url.hostname.endsWith('googleapis.com')) return;
  if (e.request.method !== 'GET') return;

  // Réseau d'abord pour la coquille, cache en secours.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
