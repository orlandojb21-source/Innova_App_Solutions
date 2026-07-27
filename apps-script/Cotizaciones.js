var ESTADOS_COTIZACION = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada'];

function cotizacionesListar() {
  var cotizaciones = sheetToObjects(sheet_('Cotizaciones'));
  return cotizaciones.sort(function (a, b) { return new Date(b.FechaCreacion) - new Date(a.FechaCreacion); });
}

function cotizacionesObtener(id) {
  if (!id) throw new Error('Falta el Id de la cotización.');
  var cot = sheetToObjects(sheet_('Cotizaciones')).filter(function (c) { return c.Id === id; })[0];
  if (!cot) throw new Error('Cotización no encontrada.');
  cot.Items = itemsDeCotizacion_(id);
  return cot;
}

function itemsDeCotizacion_(cotizacionId) {
  return sheetToObjects(sheet_('CotizacionItems')).filter(function (it) { return it.CotizacionId === cotizacionId; });
}

function siguienteFolio_() {
  var anio = new Date().getFullYear();
  var prefijo = 'COT-' + anio + '-';
  var cotizaciones = sheetToObjects(sheet_('Cotizaciones'));
  var delAnio = cotizaciones.filter(function (c) { return String(c.Folio || '').indexOf(prefijo) === 0; });
  var siguiente = delAnio.length + 1;
  return prefijo + ('0000' + siguiente).slice(-4);
}

function validarItems_(items) {
  if (!items || !items.length) throw new Error('Agrega al menos un ítem a la cotización.');
  items.forEach(function (it) {
    if (!it.Descripcion || !String(it.Descripcion).trim()) throw new Error('Cada ítem necesita una descripción.');
    if (isNaN(Number(it.Cantidad)) || Number(it.Cantidad) <= 0) throw new Error('Cantidad inválida en el ítem "' + it.Descripcion + '".');
    if (isNaN(Number(it.PrecioUnitario)) || Number(it.PrecioUnitario) < 0) throw new Error('Precio unitario inválido en el ítem "' + it.Descripcion + '".');
  });
}

function calcularTotales_(items, descuentoPct, impuestoPct) {
  var subtotal = items.reduce(function (acc, it) { return acc + Number(it.Cantidad) * Number(it.PrecioUnitario); }, 0);
  var descuento = subtotal * (Number(descuentoPct || 0) / 100);
  var base = subtotal - descuento;
  var impuesto = base * (Number(impuestoPct || 0) / 100);
  return { subtotal: round2_(subtotal), total: round2_(base + impuesto) };
}

function reemplazarItems_(cotizacionId, items) {
  var itemsSheet = sheet_('CotizacionItems');
  var data = itemsSheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === cotizacionId) itemsSheet.deleteRow(i + 1);
  }
  items.forEach(function (it) {
    appendRow(itemsSheet, {
      Id: newId(),
      CotizacionId: cotizacionId,
      Descripcion: it.Descripcion,
      Cantidad: Number(it.Cantidad),
      PrecioUnitario: Number(it.PrecioUnitario),
      Subtotal: round2_(Number(it.Cantidad) * Number(it.PrecioUnitario))
    });
  });
}

function cotizacionesCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    if (!datos.ClienteId) throw new Error('Selecciona un cliente.');
    validarItems_(datos.Items);
    var totales = calcularTotales_(datos.Items, datos.DescuentoPct, datos.ImpuestoPct);
    var id = newId();
    var registro = {
      Id: id,
      Folio: siguienteFolio_(),
      ClienteId: datos.ClienteId,
      Fecha: datos.Fecha || nowIso(),
      ValidezDias: datos.ValidezDias || 15,
      Subtotal: totales.subtotal,
      DescuentoPct: Number(datos.DescuentoPct || 0),
      ImpuestoPct: Number(datos.ImpuestoPct || 0),
      Total: totales.total,
      Estado: 'Borrador',
      Notas: datos.Notas || '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Cotizaciones'), registro);
    reemplazarItems_(id, datos.Items);
    registro.Items = itemsDeCotizacion_(id);
    return registro;
  });
}

function cotizacionesActualizar(id, datos) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la cotización.');
    datos = datos || {};
    if (!datos.ClienteId) throw new Error('Selecciona un cliente.');
    validarItems_(datos.Items);
    var totales = calcularTotales_(datos.Items, datos.DescuentoPct, datos.ImpuestoPct);
    updateRowById(sheet_('Cotizaciones'), id, {
      ClienteId: datos.ClienteId,
      Fecha: datos.Fecha,
      ValidezDias: datos.ValidezDias,
      Subtotal: totales.subtotal,
      DescuentoPct: Number(datos.DescuentoPct || 0),
      ImpuestoPct: Number(datos.ImpuestoPct || 0),
      Total: totales.total,
      Notas: datos.Notas || ''
    });
    reemplazarItems_(id, datos.Items);
    return cotizacionesObtener(id);
  });
}

function cotizacionesCambiarEstado(id, estado) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la cotización.');
    if (ESTADOS_COTIZACION.indexOf(estado) === -1) throw new Error('Estado inválido: ' + estado);
    updateRowById(sheet_('Cotizaciones'), id, { Estado: estado });

    var ventaGenerada = false;
    if (estado === 'Aceptada') {
      try {
        crearVentaDesdeCotizacionSinLock_(id);
        ventaGenerada = true;
      } catch (e) {
        // Si ya existía una venta para esta cotización, no es un error real.
        if (!/Ya existe una venta/.test(e.message)) throw e;
      }
    }
    return { Id: id, Estado: estado, ventaGenerada: ventaGenerada };
  });
}

function cotizacionesEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la cotización.');
    deleteRowById(sheet_('Cotizaciones'), id);
    reemplazarItems_(id, []);
    return { Id: id };
  });
}
