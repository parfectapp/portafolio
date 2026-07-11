/* INVERNA · service worker — cache app shell para uso sin internet */
const CACHE = 'inverna-v42';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg',
  './css/styles.css?v=19',
  './js/store.js?v=8', './js/cloud.js?v=4', './js/data.js?v=3', './js/ui.js?v=17', './js/q.js?v=4',
  './js/forms.js?v=4', './js/views-home.js?v=21', './js/views-gastos.js?v=4',
  './js/views-cortes.js?v=4', './js/views-clientes.js?v=3', './js/views-bitacora.js?v=2',
  './js/views-prod.js?v=5', './js/app.js?v=16',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
