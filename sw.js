/* ==========================================================================
   ROUTER Dept - Offline shell
   Network-first for the app shell so updates arrive immediately, with a
   cached copy as fallback when the device has no connection.
   ========================================================================== */
'use strict';

var CACHE_NAME = 'router-app-shell-v5';
var OFFLINE_URL = new URL('./index.html', self.location.href).href;
// index.html is a standalone bundle: CSS, fonts, Chart.js and the main
// JavaScript are embedded, so only the external PWA files are cached here.
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/pwa.js',
  './icons/icon.svg',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE_NAME) return caches.delete(key);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  // Google Apps Script requests must always go to the network. Offline writes
  // are already handled by the pending queue in the app itself.
  if (url.origin !== self.location.origin) return;

  function fromCache() {
    return caches.match(request).then(function (cached) {
      if (cached) return cached;
      if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
      return null;
    });
  }

  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME)
            .then(function (cache) { return cache.put(request, copy); })
            .catch(function () { /* quota / private mode */ });
          return response;
        }

        // A server/proxy error (5xx) must not blank the installed app.
        // Fall back to the cached shell when one is available.
        if (response && response.status >= 500) {
          return fromCache().then(function (cached) {
            return cached || response;
          });
        }

        return response;
      })
      .catch(function () {
        return fromCache().then(function (cached) {
          return cached || Response.error();
        });
      })
  );
});
