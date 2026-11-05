/* khởi động + chạy ngoại tuyến */
'use strict';
if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/home');
route();
if ('storage' in navigator && navigator.storage.persist) navigator.storage.persist().catch(() => { });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
