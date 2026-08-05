/* 时间之旅 Service Worker v7
   - 安装只缓存核心文件并立即接管（不再等全量下载）
   - 激活后后台并发预缓存全部素材（之后刷新/离线秒开）
   - 代码文件 stale-while-revalidate：先用缓存秒开，后台悄悄更新，下次刷新生效 */
importScripts('precache-manifest.js');
const CACHE = 'time-for-ada-v7';
const CORE = ['./', './index.html', './game.js', './voice_lines.js', './manifest.webmanifest', './precache-manifest.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map(u => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // 后台预缓存全部素材（并发6，单个失败跳过）
    const cache = await caches.open(CACHE);
    const queue = [...PRECACHE_URLS];
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const url = queue.shift();
        try {
          if (!(await cache.match(url))) await cache.add(url);
        } catch (err) {}
      }
    }));
  })());
});

function isCore(url) {
  const p = new URL(url).pathname;
  return p.endsWith('/') || p.endsWith('.html') || p.endsWith('.js') || p.endsWith('.webmanifest');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request, { ignoreSearch: true });
    if (isCore(e.request.url)) {
      // 先用缓存秒开，后台更新
      const netP = fetch(e.request).then(res => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      return hit || (await netP) || Response.error();
    }
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
