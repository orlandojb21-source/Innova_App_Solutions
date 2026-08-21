/* Genera _capturas/index.html a partir de app/index.html.
 *
 * No duplica nada: la copia apunta a los mismos css y js de app/, así que
 * siempre muestra la versión actual del panel. Lo único que agrega es
 * demo.js, que reemplaza las llamadas al servidor por datos inventados.
 *
 * Volver a ejecutarlo (node generar.mjs) cada vez que cambie el panel.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const origen = path.join(aqui, '..', 'app', 'index.html');
const destino = path.join(aqui, 'index.html');

if (!fs.existsSync(origen)) {
  console.error('No encontré ../app/index.html');
  process.exit(1);
}

let html = fs.readFileSync(origen, 'utf8');

// Los recursos se leen de app/, no se copian.
html = html
  .replace(/(href|src)="(css|js|img)\//g, '$1="../app/$2/')
  .replace(/href="manifest\.json"/g, 'href="../app/manifest.json"');

// demo.js va después de api.js (para poder reemplazar llamarApi) y antes de
// app.js (que es quien arranca la aplicación).
const anclaApp = '<script src="../app/js/app.js"></script>';
if (!html.includes(anclaApp)) {
  console.error('No encontré la etiqueta de app.js; revisa si cambió index.html');
  process.exit(1);
}
html = html.replace(anclaApp, '<script src="demo.js"></script>\n' + anclaApp);

// El aviso deja claro en la propia pantalla que no son datos reales, para que
// nadie confunda esta copia con el panel de verdad.
const aviso = `
<div style="position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:7px 14px;
            background:#7cb342;color:#08210a;font:600 12.5px/1.4 system-ui,sans-serif;
            text-align:center" id="aviso-demo">
  Copia solo para capturas — todos los datos son inventados.
  <button type="button" onclick="document.getElementById('aviso-demo').remove()"
          style="margin-left:10px;padding:2px 9px;border:0;border-radius:5px;
                 background:#08210a;color:#e8f5e9;font:inherit;cursor:pointer">
    Ocultar para capturar
  </button>
</div>
`;
html = html.replace('</body>', aviso + '</body>');

html = html.replace(
  '<title>InnovaAppSolutions</title>',
  '<title>InnovaAppSolutions — copia para capturas</title>'
);

fs.writeFileSync(destino, html);
console.log('  index.html generado desde ../app/index.html');
