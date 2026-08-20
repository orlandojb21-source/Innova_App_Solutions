/* Innova App Solutions — service worker del sitio público.
 *
 * Estrategia deliberada: este es un sitio informativo, no una app de datos.
 * Lo que se muestra tiene que ser SIEMPRE lo último publicado, así que las
 * páginas van primero a la red y solo caen al caché si no hay señal. Los
 * archivos que no cambian de nombre (css, js, imágenes) se sirven del caché
 * y se refrescan de fondo, para que la segunda visita abra al instante.
 *
 * Al cambiar index.html, el css o el js hay que subir VERSION. Si no, quien
 * ya visitó el sitio seguirá viendo los archivos viejos guardados.
 */

const VERSION = 'v1';
const CACHE_SITIO = `innova-sitio-${VERSION}`;
const CACHE_FUENTES = `innova-fuentes-${VERSION}`;

const ESENCIALES = [
  './',
  './index.html',
  './css/styles.css',
  './js/main.js',
  './site.webmanifest',
  './img/chica_trabajando.webp',
  './img/icon-app-192.png',
  './img/icon-app-512.png',
  './img/icon-app-maskable.png',
];

const HOSTS_FUENTES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_SITIO)
      // addAll falla entero si un archivo falla; se agregan de a uno para que
      // un recurso caído no impida instalar el service worker.
      .then((cache) => Promise.allSettled(ESENCIALES.map((ruta) => cache.add(ruta))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  const vigentes = [CACHE_SITIO, CACHE_FUENTES];
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((clave) => !vigentes.includes(clave)).map((clave) => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);

  // Google Fonts: el archivo nunca cambia, así que sirve del caché y se
  // actualiza de fondo. Sin esto, sin señal la página se ve con otra letra.
  if (HOSTS_FUENTES.includes(url.hostname)) {
    evento.respondWith(cacheConRefresco(peticion, CACHE_FUENTES));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Páginas, estilos y scripts van SIEMPRE primero a la red. Si se sirviera
  // el css guardado junto a un html nuevo, la página se vería rota tras cada
  // publicación. Sin señal caen al caché, que es lo que permite abrir offline.
  if (peticion.mode === 'navigate' || peticion.destination === 'style' || peticion.destination === 'script') {
    evento.respondWith(redPrimero(peticion));
    return;
  }

  // Imágenes e íconos sí salen del caché: no cambian sin cambiar de nombre.
  evento.respondWith(cacheConRefresco(peticion, CACHE_SITIO));
});

async function redPrimero(peticion) {
  try {
    const respuesta = await fetch(peticion);
    const cache = await caches.open(CACHE_SITIO);
    cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch (_) {
    const guardada = await caches.match(peticion);
    if (guardada) return guardada;

    const inicio = await caches.match('./index.html');
    if (inicio) return inicio;

    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Sin conexión</title>' +
      '<body style="margin:0;display:grid;place-items:center;min-height:100vh;' +
      'background:#050b18;color:#cfdaef;font-family:system-ui,sans-serif;text-align:center;padding:24px">' +
      '<p>No hay conexión y esta página todavía no estaba guardada.<br>Vuelve a intentar cuando tengas señal.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function cacheConRefresco(peticion, nombreCache) {
  const cache = await caches.open(nombreCache);
  const guardada = await cache.match(peticion);

  const enRed = fetch(peticion)
    .then((respuesta) => {
      // Las respuestas opacas (fuentes) no se pueden inspeccionar, pero sí guardar.
      if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
        cache.put(peticion, respuesta.clone());
      }
      return respuesta;
    })
    .catch(() => null);

  return guardada || enRed.then((r) => r || Response.error());
}
