function ventasListar() {
  var ventas = sheetToObjects(sheet_('Ventas'));
  return ventas.sort(function (a, b) { return new Date(b.Fecha) - new Date(a.Fecha); });
}

function ventasCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    if (!datos.Concepto) throw new Error('Describe el concepto de la venta.');
    if (datos.Monto === undefined || datos.Monto === null || isNaN(Number(datos.Monto))) {
      throw new Error('El monto de la venta no es válido.');
    }
    var registro = {
      Id: newId(),
      ClienteId: datos.ClienteId || '',
      CotizacionId: datos.CotizacionId || '',
      Concepto: datos.Concepto,
      Monto: round2_(datos.Monto),
      Fecha: datos.Fecha || nowIso(),
      Estado: datos.Estado || 'Pendiente',
      MetodoPago: datos.MetodoPago || '',
      Notas: datos.Notas || '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Ventas'), registro);
    return registro;
  });
}

function ventasActualizar(id, cambios) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la venta.');
    if (cambios && cambios.Monto !== undefined) cambios.Monto = round2_(cambios.Monto);
    updateRowById(sheet_('Ventas'), id, cambios);
    return { Id: id };
  });
}

function ventasEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la venta.');
    deleteRowById(sheet_('Ventas'), id);
    return { Id: id };
  });
}

function ventasCrearDesdeCotizacion(cotizacionId) {
  return withLock(function () {
    if (!cotizacionId) throw new Error('Falta el Id de la cotización.');
    var cot = sheetToObjects(sheet_('Cotizaciones')).filter(function (c) { return c.Id === cotizacionId; })[0];
    if (!cot) throw new Error('Cotización no encontrada.');
    if (cot.Estado !== 'Aceptada') throw new Error('Solo se puede convertir en venta una cotización Aceptada.');
    var yaExiste = sheetToObjects(sheet_('Ventas')).some(function (v) { return v.CotizacionId === cotizacionId; });
    if (yaExiste) throw new Error('Ya existe una venta generada para esta cotización.');
    var registro = {
      Id: newId(),
      ClienteId: cot.ClienteId,
      CotizacionId: cot.Id,
      Concepto: 'Cotización ' + cot.Folio,
      Monto: round2_(cot.Total),
      Fecha: nowIso(),
      Estado: 'Pendiente',
      MetodoPago: '',
      Notas: '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Ventas'), registro);
    return registro;
  });
}
