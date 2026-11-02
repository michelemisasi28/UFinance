/* Service worker di UFinance Track.
 * - Precache completo dell'interfaccia (HTML, CSS, JS, icone): dopo la prima apertura non serve più la rete.
 * - Nessuna richiesta a siti esterni, nessun font o libreria da CDN.
 * - Una nuova versione si installa in attesa e si attiva solo quando l'utente conferma (messaggio SKIP_WAITING).
 * - Cancella soltanto le vecchie cache dell'interfaccia (Cache Storage). IndexedDB, dove stanno i dati, non viene mai toccato. */
const BUILD = '052c44bd';
const CACHE = 'ufinance-shell-' + BUILD;
// "./" non serve: le navigazioni ricevono comunque index.html dalla cache (vedi fetch).
const SHELL = ["index.html", "css/app.css", "js/repo.js", "js/app.js", "js/pwa.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('ufinance-shell-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let res = await cache.match(req, { ignoreSearch: true });
    if (res) return res;
    if (req.mode === 'navigate') { res = await cache.match('index.html'); if (res) return res; }
    try { return await fetch(req); }
    catch (err) { return new Response('Non disponibile senza rete.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  })());
});
