let _monedaActual = '$';

// Caché en sesión de datos que casi no cambian (Config/Clientes/Proyectos),
// para no volver a pedirlos cada vez que se abre una pantalla. Se invalida
// solo cuando algo los modifica de verdad (guardar/eliminar/restaurar).
let _cacheGlobalConfig = null;
let _cacheGlobalClientes = null;
let _cacheGlobalProyectos = null;

async function obtenerConfigCache() {
  if (!_cacheGlobalConfig) {
    _cacheGlobalConfig = await llamarApi('config.obtener');
  }
  _monedaActual = _cacheGlobalConfig.Moneda || '$';
  return _cacheGlobalConfig;
}

function invalidarCacheConfig() { _cacheGlobalConfig = null; }

async function obtenerClientesCache() {
  if (!_cacheGlobalClientes) {
    _cacheGlobalClientes = await llamarApi('clientes.listar').catch(() => []);
  }
  return _cacheGlobalClientes;
}

function invalidarCacheClientes() { _cacheGlobalClientes = null; }

async function obtenerProyectosCache() {
  if (!_cacheGlobalProyectos) {
    _cacheGlobalProyectos = await llamarApi('proyectos.listar').catch(() => []);
  }
  return _cacheGlobalProyectos;
}

function invalidarCacheProyectos() { _cacheGlobalProyectos = null; }

function esc(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(n, simbolo) {
  simbolo = simbolo || '$';
  const num = Number(n) || 0;
  return simbolo + num.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  if (!iso) return '—';
  const str = String(iso);
  let d;
  const soloFecha = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (soloFecha) {
    d = new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  } else {
    d = new Date(str);
  }
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function diasHastaFecha(fechaIso) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const partes = String(fechaIso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return NaN;
  const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
}

function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function mostrarToast(mensaje, tipo) {
  const cont = qs('#toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (tipo ? ' ' + tipo : '');
  el.textContent = mensaje;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function abrirModal(html) {
  qs('#modal-contenido').innerHTML = html;
  qs('#modal-overlay').classList.remove('oculto');
}

function cerrarModal() {
  qs('#modal-overlay').classList.add('oculto');
  qs('#modal-contenido').innerHTML = '';
}

function descargarBase64(nombreArchivo, base64, mime) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function badgeEstado(estado, mapa) {
  const clase = (mapa && mapa[estado]) || 'badge-gris';
  return `<span class="badge ${clase}">${esc(estado)}</span>`;
}

function enlaceWhatsapp(telefono) {
  if (!telefono) return '';
  const digitos = String(telefono).replace(/\D/g, '');
  if (!digitos) return '';
  return `https://wa.me/${digitos}`;
}

function enlaceTelefonoHtml(telefono) {
  if (!telefono) return '—';
  const url = enlaceWhatsapp(telefono);
  return `<a href="${esc(url)}" target="_blank" rel="noopener" class="link-whatsapp" title="Abrir chat de WhatsApp">${esc(telefono)}</a>`;
}

document.addEventListener('click', (e) => {
  if (e.target.matches('[data-cerrar-modal]') || e.target.id === 'modal-overlay') {
    cerrarModal();
  }
});
