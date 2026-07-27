// Bump CACHE_NAME en cada deploy que cambie index.html/css/js — si no, los
// usuarios con la app instalada seguirán viendo la versión vieja cacheada.
const CACHE_NAME = 'ias-panel-v12';

const ARCHIVOS_SHELL = [
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/utils.js',
  './js/api.js',
  './js/auth.js',
  './js/alertas.js',
  './js/dashboard.js',
  './js/clientes.js',
  './js/cotizaciones.js',
  './js/ventas.js',
  './js/suscripciones.js',
  './js/proyectos.js',
  './js/ajustes.js',
  './js/app.js',
  './img/icon-192.png',
  './img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Las llamadas a la API de Apps Script siempre van a la red.
  if (url.hostname.endsWith('script.google.com')) return;

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cacheada) => cacheada || fetch(event.request))
  );
});
