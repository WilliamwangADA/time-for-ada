/* 时间之旅 Service Worker：安装时预缓存全部资源，之后刷新/离线本地秒开 */
importScripts('precache-manifest.js');
const CACHE = 'time-for-ada-v6';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 逐个缓存（单个失败不影响整体），并发 6 个
    const queue = [...PRECACHE_URLS];
    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const url = queue.shift();
        try {
          const hit = await cache.match(url);
          if (!hit) await cache.add(url);
        } catch (err) { /* 单文件失败跳过，运行时兜底 */ }
      }
    });
    await Promise.all(workers);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    } catch (err) {
      return hit || Response.error();
    }
  })());
});
