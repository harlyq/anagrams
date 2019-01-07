self.addEventListener('install', (e) => e.waitUntil(installServiceWorker));
const installServiceWorker = async () => {
    const cache = await caches.open('anagrams-cache-v1');
    return await cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico',
        '/image/anagram2d_192x192.png',
        '/image/anagram2d_512x512.png',
        '/image/safari-pinned-tab.svg',
        '/anagram.js',
        '/buildworker.js',
        //'/dist/serviceworker.js', don't cache the service worker??
        '/words.txt',
    ]);
};
self.addEventListener('fetch', (e) => e.respondWith(fetchFromCache(e.request)));
const fetchFromCache = async (request) => {
    const result = await caches.match(request);
    if (result) {
        console.log("from cache", request);
        return result;
    }
    else {
        console.log("from network", request);
        return fetch(request);
    }
};
