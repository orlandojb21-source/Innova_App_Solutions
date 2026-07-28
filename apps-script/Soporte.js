var FRECUENCIAS_SOPORTE = ['Mensual', 'Anual'];

function soporteListar() {
  var contratos = sheetToObjects(sheet_('Soporte'));
  return contratos.sort(function (a, b) { return new Date(a.ProximoVencimiento) - new Date(b.ProximoVencimiento); });
}

function validarSoporte_(datos) {
  if (!datos.ClienteId) throw new Error('Selecciona un cliente.');
  if (!datos.Concepto || !String(datos.Concepto).trim()) throw new Error('Indica el concepto del contrato de soporte.');
  if (datos.Monto === undefined || datos.Monto === null || isNaN(Number(datos.Monto))) throw new Error('Monto inválido.');
  if (FRECUENCIAS_SOPORTE.indexOf(datos.Frecuencia) === -1) throw new Error('Frecuencia inválida.');
}

function soporteCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    validarSoporte_(datos);
    var fechaInicio = (datos.FechaInicio || nowIso()).slice(0, 10);
    var registro = {
      Id: newId(),
      ClienteId: datos.ClienteId,
      ProyectoId: datos.ProyectoId || '',
      Concepto: datos.Concepto,
      Alcance: datos.Alcance || '',
      Monto: round2_(datos.Monto),
      Frecuencia: datos.Frecuencia,
      FechaInicio: fechaInicio,
      ProximoVencimiento: datos.ProximoVencimiento || avanzarFecha_(fechaInicio, datos.Frecuencia),
      Estado: 'Activo',
      Notas: datos.Notas || '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Soporte'), registro);
    return registro;
  });
}

function soporteActualizar(id, cambios) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del contrato de soporte.');
    cambios = cambios || {};
    if (cambios.Monto !== undefined) cambios.Monto = round2_(cambios.Monto);
    updateRowById(sheet_('Soporte'), id, cambios);
    return { Id: id };
  });
}

function soporteEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del contrato de soporte.');
    deleteRowById(sheet_('Soporte'), id);
    return { Id: id };
  });
}

function soporteRegistrarPago(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del contrato de soporte.');
    var sheet = sheet_('Soporte');
    var contrato = sheetToObjects(sheet).filter(function (s) { return s.Id === id; })[0];
    if (!contrato) throw new Error('Contrato de soporte no encontrado.');

    var nuevoVencimiento = avanzarFecha_(contrato.ProximoVencimiento, contrato.Frecuencia);
    updateRowById(sheet, id, { ProximoVencimiento: nuevoVencimiento, Estado: 'Activo' });

    appendRow(sheet_('Ventas'), {
      Id: newId(),
      ClienteId: contrato.ClienteId,
      CotizacionId: '',
      Concepto: 'Soporte: ' + contrato.Concepto,
      Monto: contrato.Monto,
      MontoPagado: contrato.Monto,
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

function soporteAlertas() {
  var contratos = sheetToObjects(sheet_('Soporte')).filter(function (s) { return s.Estado === 'Activo'; });
  var alertas = contratos.map(function (s) {
    var copia = {};
    Object.keys(s).forEach(function (k) { copia[k] = s[k]; });
    copia.diasRestantes = diasDesdeHoy_(s.ProximoVencimiento);
    return copia;
  }).filter(function (s) { return s.diasRestantes <= UMBRAL_DIAS_ALERTA_SUSCRIPCION; });
  alertas.sort(function (a, b) { return a.diasRestantes - b.diasRestantes; });
  return alertas;
}
