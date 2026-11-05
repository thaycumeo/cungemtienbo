const V = 'cet-v2-18';
const FILES = ['./', 'index.html', 'styles.css', 'demo.js', 'core.js', 'views1.js', 'views2.js', 'views3.js', 'ai.js', 'xlsx.js', 'report.js', 'docread.js', 'ppct.js', 'qstatic.js', 'qgen.js', 'qbank.js', 'main.js', 'ufo.html', 'vendor/qr.js', 'manifest.webmanifest',
  'fonts/BricolageGrotesque-Bold.ttf', 'fonts/Inter-Regular.otf', 'fonts/Inter-Bold.otf', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x !== 'cet-fonts').map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {   // phông chữ tròn: lưu lại sau lần tải đầu để dùng ngoại tuyến
    e.respondWith(caches.open('cet-fonts').then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => hit))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r;
  }).catch(() => caches.match('index.html'))));
});
