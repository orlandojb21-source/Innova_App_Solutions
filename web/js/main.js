/* Innova App Solutions — comportamiento del sitio público.
   Sin dependencias externas: menú móvil, estado del encabezado, año del pie
   y el bloque de instalación, que es la demostración de qué es una PWA. */

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

  /* ---------- Service worker ----------
     Permite que el navegador ofrezca instalar el sitio y que siga abriendo
     sin señal. La estrategia de caché está explicada en sw.js. */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Si falla (navegador viejo, http sin cifrar), el sitio funciona igual.
      });
    });
  }

  /* ---------- Bloque de instalación ----------
     Chrome, Edge y Android avisan con 'beforeinstallprompt' y permiten abrir
     el diálogo nativo. Safari en iPhone no lo soporta: ahí solo queda explicar
     el gesto manual. Por eso el botón siempre hace algo útil. */

  const botonInstalar = document.getElementById('btn-instalar');
  const estadoInstalar = document.getElementById('estado-instalacion');

  if (botonInstalar && estadoInstalar) {
    let promptDiferido = null;

    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const estaInstalada = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    const decir = (texto) => { estadoInstalar.textContent = texto; };

    if (estaInstalada) {
      botonInstalar.hidden = true;
      decir('Ya la tienes instalada: la estás viendo como aplicación.');
    } else if (esIOS) {
      decir('En iPhone y iPad se instala a mano. Toca el botón y te digo cómo.');
    } else {
      decir('Toma unos segundos y no ocupa casi espacio.');
    }

    window.addEventListener('beforeinstallprompt', (evento) => {
      evento.preventDefault();
      promptDiferido = evento;
      decir('Tu navegador puede instalarla ahora mismo.');
    });

    botonInstalar.addEventListener('click', async () => {
      if (promptDiferido) {
        botonInstalar.disabled = true;
        promptDiferido.prompt();

        const { outcome } = await promptDiferido.userChoice;
        promptDiferido = null;
        botonInstalar.disabled = false;

        decir(outcome === 'accepted'
          ? 'Instalando. Búscala en tu pantalla de inicio.'
          : 'Cancelaste la instalación. Puedes volver a intentarlo cuando quieras.');
        return;
      }

      if (esIOS) {
        decir('En iPhone: toca Compartir (el cuadrado con la flecha hacia arriba), '
          + 'baja y elige "Añadir a pantalla de inicio".');
        return;
      }

      decir('Tu navegador no ofrece instalación automática. En Chrome o Edge busca '
        + 'el ícono de instalar al final de la barra de direcciones.');
    });

    window.addEventListener('appinstalled', () => {
      botonInstalar.hidden = true;
      decir('Lista. Ya está en tu pantalla de inicio, con su propio ícono.');
    });
  }
})();
