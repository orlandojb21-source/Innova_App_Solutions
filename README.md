# Innova App Solutions

Este repositorio contiene **tres cosas separadas** que viven en el mismo dominio.
Cada carpeta es independiente: puedes tocar una sin riesgo de romper las otras.

```
Innova App Solutions/
│
├── web/            ← LA PÁGINA WEB PÚBLICA  (innovaapps.app)
│   ├── index.html          la página completa
│   ├── css/styles.css      todos los estilos
│   ├── js/main.js          menú móvil, instalación y detalles
│   ├── img/                logo, íconos y foto de portada
│   ├── sw.js               permite instalarla y usarla sin internet
│   ├── site.webmanifest    nombre e íconos de la aplicación instalada
│   ├── robots.txt          permiso para que Google la indexe
│   ├── sitemap.xml         mapa del sitio para Google
│   └── vercel.json         cabeceras de seguridad y caché
│
├── app/            ← EL PANEL DE FACTURACIÓN  (app.innovaapps.app)
│   ├── index.html          la aplicación
│   ├── css/styles.css
│   ├── js/                 un archivo por sección (ventas, gastos, etc.)
│   ├── img/
│   ├── manifest.json       datos para instalarla en el celular
│   └── sw.js               permite usarla sin internet
│
├── apps-script/    ← EL BACKEND del panel (Google Apps Script)
│   └── *.js                se sube con `clasp push`, NO se publica en Vercel
│
└── _capturas/      ← COPIA DEL PANEL CON DATOS FALSOS, para tomar capturas
```

**Regla simple:** todo lo de la página web está dentro de `web/`.
Todo lo del panel está dentro de `app/`. Nada del panel vive fuera de `app/`.

---

## Cómo se publica cada parte

En Vercel hay **dos proyectos que apuntan a este mismo repositorio**. Lo único que
los diferencia es el ajuste *Root Directory* (carpeta raíz) de cada uno:

| Proyecto en Vercel | Root Directory | Dominio |
|---|---|---|
| `innova-web` | `web` | `innovaapps.app` |
| `innova-app-solutions` | `app` | `app.innovaapps.app` |

Con eso, cada proyecto **publica solo el contenido de su carpeta**: aunque toques la
web, el panel sigue sirviendo exactamente los mismos archivos que antes.

Lo que sí ocurre es que un cambio en cualquier carpeta **dispara el despliegue de los
dos proyectos**, porque ambos vigilan el mismo repositorio. Es inofensivo —el que no
cambió vuelve a publicar lo mismo— pero si molesta, Vercel lo evita: Settings →
Build and Deployment → Root Directory → activar el interruptor **Skip deployment**,
que salta el despliegue cuando el commit no tocó esa carpeta.

### Si algún día hay que rehacer esta configuración

1. **En el proyecto del panel** (`innova-app-solutions`):
   Settings → **Build and Deployment** → bajar hasta **Root Directory** → escribir `app` → Save.
   *Ojo: no está en "General", aunque antes sí estaba ahí.*
   *Sin este paso el panel deja de cargar, porque sus archivos no están en la raíz.*

2. **El proyecto de la web:**
   Add New → Project → elegir el repositorio `Innova_App_Solutions` →
   Root Directory: `web` → Framework Preset: *Other* → Deploy.

   *Ojo: al importar, el Root Directory no siempre se guarda aunque lo escribas en
   esa pantalla. Hay que verificarlo después en Settings y volver a desplegar.*

3. **El dominio de Porkbun.** En cada proyecto de Vercel, pestaña **Domains** —
   está *afuera* de Settings, como pestaña propia del proyecto — botón **Add Domains**.

   En `innova-web` se agregan dos: `innovaapps.app` conectado a Production, y
   `www.innovaapps.app` como **Redirect to Another Domain** (308) hacia `innovaapps.app`,
   para que exista una sola dirección oficial. En `innova-app-solutions` se agrega
   `app.innovaapps.app` conectado a Production.

   En Porkbun quedó así:

   | Tipo | Host | Apunta a |
   |---|---|---|
   | A | (vacío / `@`) | `76.76.21.21` |
   | CNAME | `www` | `75b8096030081d41.vercel-dns-017.com` |
   | CNAME | `app` | `0d377bf77cc593f3.vercel-dns-017.com` |

   Los dos CNAME son distintos porque cada proyecto tiene el suyo. Si algún día
   se rehacen, hay que usar los valores que muestre Vercel, no estos.

   > **Sobre el `.app`:** los dominios terminados en `.app` solo funcionan con HTTPS.
   > Los navegadores se niegan a abrirlos por `http://`, sin excepción. Vercel emite
   > el certificado automáticamente al conectar el dominio, así que no hay que hacer
   > nada extra; pero si justo después de configurar el DNS ves un error de seguridad,
   > casi siempre es que el certificado todavía se está emitiendo. Espera unos minutos.

> Nota: la carpeta oculta `.vercel/` de tu computadora apunta al proyecto del panel.
> Si algún día usas el comando `vercel` desde la terminal, hazlo **entrando primero a
> la carpeta** (`cd web` o `cd app`), nunca desde la raíz.

---

## Datos de contacto de la página web

Si algún día cambian, hay que actualizarlos en estos archivos:

| Dato | Valor actual | Archivos |
|---|---|---|
| Dominio | `innovaapps.app` | `index.html`, `robots.txt`, `sitemap.xml` |
| WhatsApp | `50767604043` | `index.html` (enlace `wa.me`) |
| Correo | `info@innovaapps.app` | `index.html` (enlace `mailto` y datos para Google) |

Falta una **imagen de vista previa**: la que se ve al compartir el enlace por WhatsApp
o Facebook. Hoy usa el logo cuadrado, que funciona pero se ve pequeño. Lo ideal es una
imagen de 1200×630 px guardada en `web/img/` y apuntar ahí la etiqueta `og:image`.

---

## La web es una PWA instalable

Es a propósito: la propuesta de venta es "hacemos PWAs", así que el sitio es uno.
La sección *Pruébalo aquí mismo* deja que el visitante la instale y lo compruebe.

Tres cosas que conviene no romper:

- **El service worker (`web/sw.js`) sirve páginas, CSS y JavaScript primero desde la
  red**, no desde el caché. Es deliberado: si sirviera el CSS guardado junto a un
  HTML nuevo, la página se vería descuadrada después de cada publicación. Solo las
  imágenes y las fuentes salen del caché.
- Al cambiar `index.html`, el CSS o el JS conviene **subir `VERSION` en `sw.js`**.
- **iOS ignora `site.webmanifest`** y usa la etiqueta `apple-touch-icon` del HTML.
  Si se cambia el ícono, hay que cambiarlo en los dos lugares.

Los íconos `icon-app-*.png` son solo el monograma, porque el logo completo con el
texto "INNOVA APP SOLUTIONS" es ilegible a 96px en una pantalla de inicio. El logo
completo (`icon-512.png`) se conserva para `og:image`, donde sí se ve grande.

---

## Capturas del panel para la web

`_capturas/` es una copia del panel **que no se conecta a nada**: reemplaza las
llamadas al servidor por datos inventados. Sirve para tomar capturas de pantalla
sin exponer información de ningún cliente y sin tocar la hoja real.

No se publica en ningún lado: queda fuera de las carpetas que Vercel sube.

```
cd _capturas
node generar.mjs
```

Luego se abre `_capturas/index.html` con doble clic. El panel entra directo, sin
pedir cuenta de Google, con clientes, cotizaciones, ventas y gastos de mentira.
Abajo sale una franja verde que avisa que son datos inventados, con un botón para
ocultarla justo antes de capturar.

Hay que volver a ejecutar `node generar.mjs` cada vez que cambie `app/index.html`.
Los estilos y el JavaScript se leen directo de `app/`, así que esos siempre están
al día.

Si al capturar sale un error diciendo que una acción no guarda nada, es correcto:
solo están simuladas las pantallas de consulta, no las de guardar o borrar.

---

## El backend del panel

`apps-script/` es el código que corre en Google Apps Script y guarda los datos en
Google Sheets. **No se publica en Vercel.** Se sube aparte:

```
cd apps-script
clasp push
```

Recuerda que `clasp push` por sí solo no actualiza la Web App en vivo: hay que crear
una versión nueva y volver a desplegar el mismo ID de despliegue.
