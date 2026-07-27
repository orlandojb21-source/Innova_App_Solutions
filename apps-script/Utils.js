/**
 * Utilidades compartidas: acceso al Sheet, mapeo de filas, saneamiento
 * anti-inyección de fórmulas, bloqueo de escritura y respuestas JSON.
 */

function getScriptProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function ss_() {
  var id = getScriptProp_('SHEET_ID');
  if (!id) {
    throw new Error('El proyecto no ha sido configurado. Ejecuta configurarProyecto() desde el editor de Apps Script.');
  }
  return SpreadsheetApp.openById(id);
}

function sheet_(nombre) {
  var sheet = ss_().getSheetByName(nombre);
  if (!sheet) throw new Error('Hoja no encontrada: ' + nombre);
  return sheet;
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function sheetToObjects(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var lastCol = sheet.getLastColumn();
  var headers = headers_(sheet);
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values.map(function (fila) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = fila[i]; });
    return obj;
  });
}

function appendRow(sheet, obj) {
  var headers = headers_(sheet);
  var fila = headers.map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    return typeof v === 'string' ? sanitizeForSheet(v) : v;
  });
  sheet.appendRow(fila);
}

function findRowIndexById(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function updateRowById(sheet, id, cambios) {
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error('Registro no encontrado: ' + id);
  cambios = cambios || {};
  var headers = headers_(sheet);
  var lastCol = sheet.getLastColumn();
  var actual = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
  headers.forEach(function (h, i) {
    if (Object.prototype.hasOwnProperty.call(cambios, h)) {
      var v = cambios[h];
      actual[i] = typeof v === 'string' ? sanitizeForSheet(v) : v;
    }
  });
  sheet.getRange(rowIndex, 1, 1, lastCol).setValues([actual]);
  return rowIndex;
}

function deleteRowById(sheet, id) {
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error('Registro no encontrado: ' + id);
  sheet.deleteRow(rowIndex);
}

/** Antídoto contra inyección de fórmulas (CSV/Sheets injection): si el texto
 *  empieza con un caracter que Sheets interpretaría como fórmula, se antepone
 *  un apóstrofo para forzar texto plano. */
function sanitizeForSheet(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(status, data, message) {
  var body = { status: status, data: data === undefined ? null : data, message: message || '' };
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function okResponse(data, message) { return jsonResponse('success', data, message); }
function errorResponse(message) { return jsonResponse('error', null, message); }

function newId() { return Utilities.getUuid(); }
function nowIso() { return new Date().toISOString(); }
function round2_(n) { return Math.round((Number(n) || 0) * 100) / 100; }

/** Días de diferencia entre hoy (zona horaria de Panamá) y una fecha
 *  "yyyy-MM-dd", comparando solo el día calendario (evita bugs de horas). */
function diasDesdeHoy_(fechaIso) {
  var msPorDia = 24 * 60 * 60 * 1000;
  var hoyStr = Utilities.formatDate(new Date(), 'America/Panama', 'yyyy-MM-dd');
  var hoy = new Date(hoyStr + 'T00:00:00Z');
  var fecha = new Date(String(fechaIso).slice(0, 10) + 'T00:00:00Z');
  return Math.round((fecha - hoy) / msPorDia);
}

function configObtener() {
  var sheet = sheet_('Config');
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) config[data[i][0]] = data[i][1];
  return config;
}

function configGuardar(cambios) {
  return withLock(function () {
    var sheet = sheet_('Config');
    var data = sheet.getDataRange().getValues();
    var filaPorClave = {};
    for (var i = 1; i < data.length; i++) filaPorClave[data[i][0]] = i + 1;
    Object.keys(cambios || {}).forEach(function (clave) {
      var valor = cambios[clave];
      valor = typeof valor === 'string' ? sanitizeForSheet(valor) : valor;
      if (filaPorClave[clave]) {
        sheet.getRange(filaPorClave[clave], 2).setValue(valor);
      } else {
        sheet.appendRow([clave, valor]);
      }
    });
    return configObtener();
  });
}
