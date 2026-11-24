/* ============================================================
   sin-conexion.js
   Guarda una copia de los archivos de la app en la tablet
   para que se pueda abrir aunque no haya internet.

   IMPORTANTE: cada vez que cambies algún archivo de la app,
   sube el número de VERSION (v1 -> v2 -> v3...) para que la
   tablet descargue los archivos nuevos.
   ============================================================ */

var VERSION = 'inventario-v6';

var ARCHIVOS = [
    './',
    './index.html',
    './manifest.json',
    './css/estilos.css',
    './js/jquery.min.js',
    './js/datos.js',
    './js/colores.js',
    './js/ayudas.js',
    './js/plantillas.js',
    './js/app.js',
    './iconos/icono-192.png',
    './iconos/icono-512.png'
];

// Al instalarse: guardar todos los archivos
self.addEventListener('install', function (evento) {
    evento.waitUntil(
        caches.open(VERSION).then(function (almacen) {
            return almacen.addAll(ARCHIVOS);
        })
    );
    self.skipWaiting();
});

// Al activarse: borrar las copias de versiones anteriores
self.addEventListener('activate', function (evento) {
    evento.waitUntil(
        caches.keys().then(function (nombres) {
            var borrados = [];
            for (var i = 0; i < nombres.length; i++) {
                if (nombres[i] !== VERSION) {
                    borrados.push(caches.delete(nombres[i]));
                }
            }
            return Promise.all(borrados);
        })
    );
    self.clients.claim();
});

// Al pedir un archivo: primero la copia guardada; si no está, internet
self.addEventListener('fetch', function (evento) {
    evento.respondWith(
        caches.match(evento.request).then(function (respuestaGuardada) {
            if (respuestaGuardada) {
                return respuestaGuardada;
            }
            return fetch(evento.request);
        })
    );
});
