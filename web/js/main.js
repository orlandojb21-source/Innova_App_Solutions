/* Innova App Solutions — comportamiento del sitio público.
   Sin dependencias externas: menú móvil, estado del encabezado y año del pie. */

(function () {
  'use strict';

  /* ---------- Menú móvil ---------- */

  const boton = document.getElementById('menu-boton');
  const navegacion = document.getElementById('navegacion');

  if (boton && navegacion) {
    const cerrarMenu = () => {
      navegacion.classList.remove('esta-abierta');
      boton.setAttribute('aria-expanded', 'false');
      boton.setAttribute('aria-label', 'Abrir menú');
    };

    boton.addEventListener('click', () => {
      const abierto = navegacion.classList.toggle('esta-abierta');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });

    // Al tocar cualquier enlace el menú se cierra, si no tapa la sección destino.
    navegacion.addEventListener('click', (evento) => {
      if (evento.target.closest('a')) cerrarMenu();
    });

    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && navegacion.classList.contains('esta-abierta')) {
        cerrarMenu();
        boton.focus();
      }
    });

    // Si la pantalla vuelve a tamaño de escritorio, el estado móvil deja de aplicar.
    window.matchMedia('(min-width: 901px)').addEventListener('change', (consulta) => {
      if (consulta.matches) cerrarMenu();
    });
  }

  /* ---------- Borde del encabezado al desplazarse ---------- */

  const encabezado = document.getElementById('encabezado');

  if (encabezado) {
    const actualizarEncabezado = () => {
      encabezado.classList.toggle('esta-desplazado', window.scrollY > 12);
    };
    actualizarEncabezado();
    window.addEventListener('scroll', actualizarEncabezado, { passive: true });
  }

  /* ---------- Año en el pie ---------- */

  const anio = document.getElementById('anio');
  if (anio) anio.textContent = String(new Date().getFullYear());
})();
