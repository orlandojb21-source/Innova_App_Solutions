# Innova App Solutions

Este repositorio contiene **tres cosas separadas** que viven en el mismo dominio.
Cada carpeta es independiente: puedes tocar una sin riesgo de romper las otras.

```
Innova App Solutions/
│
├── web/            ← LA PÁGINA WEB PÚBLICA  (innovaapps.app)
│   ├── index.html          la página completa
│   ├── css/styles.css      todos los estilos
│   ├── js/main.js          menú móvil y detalles
│   ├── img/                logo e íconos
│   ├── site.webmanifest    datos del ícono para el navegador
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
└── apps-script/    ← EL BACKEND del panel (Google Apps Script)
    └── *.js                se sube con `clasp push`, NO se publica en Vercel
```

**Regla simple:** todo lo de la página web está dentro de `web/`.
Todo lo del panel está dentro de `app/`. Nada del panel vive fuera de `app/`.

---

## Cómo se publica cada parte

En Vercel hay **dos proyectos que apuntan a este mismo repositorio**. Lo único que
los diferencia es el ajuste *Root Directory* (carpeta raíz) de cada uno:

| Proyecto en Vercel | Root Directory | Dominio |
|---|---|---|
| `innova-web` (nuevo) | `web` | `innovaapps.app` |
| `innova-app-solutions` (el que ya existe) | `app` | `app.innovaapps.app` |

Con eso, cuando subes cambios a GitHub cada proyecto publica solo su carpeta.
Cambiar la web nunca vuelve a publicar el panel, y viceversa.

### Pasos para dejarlo andando

1. **En el proyecto que ya existe** (`innova-app-solutions`):
   Settings → **Build and Deployment** → bajar hasta **Root Directory** → escribir `app` → Save.
   *Ojo: no está en "General", aunque antes sí estaba ahí.*
   *Sin este paso el panel deja de cargar, porque sus archivos ya no están en la raíz.*

2. **Crear el proyecto nuevo** para la web:
   Add New → Project → elegir el repositorio `Innova_App_Solutions` →
   Root Directory: `web` → Framework Preset: *Other* → Deploy.

3. **Conectar el dominio de Porkbun.** En cada proyecto de Vercel, entrar a la pestaña
   **Domains** — está *afuera* de Settings, como pestaña propia del proyecto, junto a
   Deployments — botón **Add Domains**, y copiar los valores de DNS que Vercel indique.

   En `innova-web` se agregan dos: `innovaapps.app` conectado a Production, y
   `www.innovaapps.app` como **Redirect to Another Domain** (308) hacia `innovaapps.app`,
   para que exista una sola dirección oficial. En `innova-app-solutions` se agrega
   `app.innovaapps.app` conectado a Production.

   En Porkbun quedará algo así:

   | Tipo | Host | Apunta a |
   |---|---|---|
   | A | (vacío / `@`) | la IP que da Vercel |
   | CNAME | `www` | el destino que da Vercel |
   | CNAME | `app` | el destino que da Vercel |

   Los valores exactos los muestra Vercel al agregar el dominio; usar esos, no inventarlos.

   > **Sobre el `.app`:** los dominios terminados en `.app` solo funcionan con HTTPS.
   > Los navegadores se niegan a abrirlos por `http://`, sin excepción. Vercel emite
   > el certificado automáticamente al conectar el dominio, así que no hay que hacer
   > nada extra; pero si justo después de configurar el DNS ves un error de seguridad,
   > casi siempre es que el certificado todavía se está emitiendo. Espera unos minutos.

> Nota: la carpeta oculta `.vercel/` de tu computadora sigue apuntando al proyecto
> del panel. Si algún día usas el comando `vercel` desde la terminal, hazlo **entrando
> primero a la carpeta** (`cd web` o `cd app`), nunca desde la raíz.

---

## Datos de contacto de la página web

Ya están puestos. Si algún día cambian, hay que actualizarlos en estos archivos:

| Dato | Valor actual | Archivos |
|---|---|---|
| Dominio | `innovaapps.app` | `index.html`, `robots.txt`, `sitemap.xml` |
| WhatsApp | `50767604043` | `index.html` (enlace `wa.me`) |
| Correo | `info@innovaapps.app` | `index.html` (enlace `mailto` y datos para Google) |

Falta una **imagen de vista previa**: la que se ve al compartir el enlace por WhatsApp
o Facebook. Hoy usa el logo cuadrado, que funciona pero se ve pequeño. Lo ideal es una
imagen de 1200×630 px guardada en `web/img/` y apuntar ahí la etiqueta `og:image`.

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
