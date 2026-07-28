var UMBRAL_DIAS_ALERTA_SUSCRIPCION = 5;
var FRECUENCIAS_SUSCRIPCION = ['Mensual', 'Anual'];

function suscripcionesListar() {
  var suscripciones = sheetToObjects(sheet_('Suscripciones'));
  return suscripciones.sort(function (a, b) { return new Date(a.ProximoVencimiento) - new Date(b.ProximoVencimiento); });
}

function avanzarFecha_(fechaIso, frecuencia) {
  var d = new Date(String(fechaIso).slice(0, 10) + 'T00:00:00Z');
  if (frecuencia === 'Anual') {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function validarSuscripcion_(datos) {
  if (!datos.ClienteId) throw new Error('Selecciona un cliente.');
  if (!datos.Producto || !String(datos.Producto).trim()) throw new Error('Indica el producto o servicio.');
  if (datos.Monto === undefined || datos.Monto === null || isNaN(Number(datos.Monto))) throw new Error('Monto inválido.');
  if (FRECUENCIAS_SUSCRIPCION.indexOf(datos.Frecuencia) === -1) throw new Error('Frecuencia inválida.');
}

function suscripcionesCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    validarSuscripcion_(datos);
    var fechaInicio = (datos.FechaInicio || nowIso()).slice(0, 10);
    var registro = {
      Id: newId(),
      ClienteId: datos.ClienteId,
      ProyectoId: datos.ProyectoId || '',
      Producto: datos.Producto,
      Monto: round2_(datos.Monto),
      Frecuencia: datos.Frecuencia,
      FechaInicio: fechaInicio,
      ProximoVencimiento: datos.ProximoVencimiento || avanzarFecha_(fechaInicio, datos.Frecuencia),
      Estado: 'Activa',
      Notas: datos.Notas || '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Suscripciones'), registro);
    return registro;
  });
}

function suscripcionesActualizar(id, cambios) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la suscripción.');
    cambios = cambios || {};
    if (cambios.Monto !== undefined) cambios.Monto = round2_(cambios.Monto);
    updateRowById(sheet_('Suscripciones'), id, cambios);
    return { Id: id };
  });
}

function suscripcionesEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la suscripción.');
    deleteRowById(sheet_('Suscripciones'), id);
    return { Id: id };
  });
}

function suscripcionesRegistrarPago(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la suscripción.');
    var sheet = sheet_('Suscripciones');
    var suscripcion = sheetToObjects(sheet).filter(function (s) { return s.Id === id; })[0];
    if (!suscripcion) throw new Error('Suscripción no encontrada.');

    var nuevoVencimiento = avanzarFecha_(suscripcion.ProximoVencimiento, suscripcion.Frecuencia);
    updateRowById(sheet, id, { ProximoVencimiento: nuevoVencimiento, Estado: 'Activa' });

    appendRow(sheet_('Ventas'), {
      Id: newId(),
      ClienteId: suscripcion.ClienteId,
      CotizacionId: '',
      Concepto: 'Suscripción: ' + suscripcion.Producto,
      Monto: suscripcion.Monto,
      MontoPagado: suscripcion.Monto,
      FacturaFolio: '',
      Fecha: nowIso(),
      Estado: 'Pagado',
      MetodoPago: '',
      Notas: '',
      FechaCreacion: nowIso()
    });

    return { Id: id, ProximoVencimiento: nuevoVencimiento };
  });
}

function suscripcionesAlertas() {
  var suscripciones = sheetToObjects(sheet_('Suscripciones')).filter(function (s) { return s.Estado === 'Activa'; });
  var alertas = suscripciones.map(function (s) {
    var copia = {};
    Object.keys(s).forEach(function (k) { copia[k] = s[k]; });
    copia.diasRestantes = diasDesdeHoy_(s.ProximoVencimiento);
    return copia;
  }).filter(function (s) { return s.diasRestantes <= UMBRAL_DIAS_ALERTA_SUSCRIPCION; });
  alertas.sort(function (a, b) { return a.diasRestantes - b.diasRestantes; });
  return alertas;
}
