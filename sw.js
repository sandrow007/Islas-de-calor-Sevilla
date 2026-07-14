const CACHE_NAME = 'manolito-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(eventCrea el archivo `sw.js` (Service Worker) en la raíz. Es el componente técnico que convertirá tu web en una aplicación real (PWA), gestionando la caché y permitiendo que la interfaz cargue inmediatamente, incluso si la red falla o la API sufre latencia.

Copia este código en `sw.js`:

```javascript
const CACHE_NAME = 'manolito-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
        .then((response) => {
            // Devuelve la versión en caché si existe, si no, hace la petición a la red
            return response || fetch(event.request);
        })
    );
});