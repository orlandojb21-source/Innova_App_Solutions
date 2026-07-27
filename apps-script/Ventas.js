function calcularEstadoVenta_(monto, montoPagado) {
  if (montoPagado >= monto) return 'Pagado';
  if (montoPagado > 0) return 'Parcial';
  return 'Pendiente';
}

function ventasListar() {
  var ventas = sheetToObjects(sheet_('Ventas'));
  return ventas.sort(function (a, b) { return new Date(b.Fecha) - new Date(a.Fecha); });
}

function ventasCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    if (!datos.Concepto) throw new Error('Describe el concepto de la venta.');
    if (datos.Monto === undefined || datos.Monto === null || isNaN(Number(datos.Monto)) || Number(datos.Monto) <= 0) {
      throw new Error('El monto de la venta no es válido.');
    }
    var monto = round2_(datos.Monto);
    var montoPagado = round2_(datos.MontoPagado || 0);
    if (montoPagado > monto) throw new Error('El monto abonado no puede ser mayor al monto total de la venta.');

    var registro = {
      Id: newId(),
      ClienteId: datos.ClienteId || '',
      CotizacionId: datos.CotizacionId || '',
      Concepto: datos.Concepto,
      Monto: monto,
      MontoPagado: montoPagado,
      Fecha: datos.Fecha || nowIso(),
      Estado: calcularEstadoVenta_(monto, montoPagado),
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
    cambios = cambios || {};
    var sheet = sheet_('Ventas');
    var actual = sheetToObjects(sheet).filter(function (v) { return v.Id === id; })[0];
    if (!actual) throw new Error('Venta no encontrada.');

    var monto = cambios.Monto !== undefined ? round2_(cambios.Monto) : Number(actual.Monto);
    var montoPagado = cambios.MontoPagado !== undefined ? round2_(cambios.MontoPagado) : Number(actual.MontoPagado || 0);
    if (montoPagado > monto) throw new Error('El monto abonado no puede ser mayor al monto total de la venta.');

    cambios.Monto = monto;
    cambios.MontoPagado = montoPagado;
    cambios.Estado = calcularEstadoVenta_(monto, montoPagado);
    updateRowById(sheet, id, cambios);
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

function ventasRegistrarAbono(id, monto) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id de la venta.');
    if (monto === undefined || monto === null || isNaN(Number(monto)) || Number(monto) <= 0) {
      throw new Error('El monto del abono no es válido.');
    }
    var sheet = sheet_('Ventas');
    var venta = sheetToObjects(sheet).filter(function (v) { return v.Id === id; })[0];
    if (!venta) throw new Error('Venta no encontrada.');

    var montoTotal = Number(venta.Monto);
    var pagadoActual = Number(venta.MontoPagado || 0);
    var saldoPendiente = round2_(montoTotal - pagadoActual);
    var nuevoMontoPagado = round2_(pagadoActual + Number(monto));

    if (nuevoMontoPagado > montoTotal) {
      throw new Error('Ese abono supera el saldo pendiente (' + saldoPendiente + ').');
    }

    var nuevoEstado = calcularEstadoVenta_(montoTotal, nuevoMontoPagado);
    updateRowById(sheet, id, { MontoPagado: nuevoMontoPagado, Estado: nuevoEstado });

    var abonoId = newId();
    appendRow(sheet_('Abonos'), {
      Id: abonoId,
      VentaId: id,
      Folio: siguienteFolioAbono_(),
      Monto: round2_(monto),
      Fecha: nowIso(),
      FechaCreacion: nowIso()
    });

    return { Id: id, MontoPagado: nuevoMontoPagado, Estado: nuevoEstado, AbonoId: abonoId };
  });
}

function siguienteFolioAbono_() {
  var anio = new Date().getFullYear();
  var prefijo = 'REC-' + anio + '-';
  var abonos = sheetToObjects(sheet_('Abonos'));
  var delAnio = abonos.filter(function (a) { return String(a.Folio || '').indexOf(prefijo) === 0; });
  return prefijo + ('0000' + (delAnio.length + 1)).slice(-4);
}

function asignarFolioFactura_(ventaId) {
  var anio = new Date().getFullYear();
  var prefijo = 'FACT-' + anio + '-';
  var ventas = sheetToObjects(sheet_('Ventas'));
  var delAnio = ventas.filter(function (v) { return String(v.FacturaFolio || '').indexOf(prefijo) === 0; });
  var folio = prefijo + ('0000' + (delAnio.length + 1)).slice(-4);
  updateRowById(sheet_('Ventas'), ventaId, { FacturaFolio: folio });
  return folio;
}

function ventasCrearDesdeCotizacion(cotizacionId) {
  return withLock(function () {
    return crearVentaDesdeCotizacionSinLock_(cotizacionId);
  });
}

/**
 * Misma lógica que ventasCrearDesdeCotizacion pero sin adquirir el lock,
 * para poder llamarla desde cotizacionesCambiarEstado (que ya sostiene el
 * lock) sin intentar bloquear dos veces dentro de la misma ejecución.
 */
function crearVentaDesdeCotizacionSinLock_(cotizacionId) {
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
    MontoPagado: 0,
    Fecha: nowIso(),
    Estado: 'Pendiente',
    MetodoPago: '',
    Notas: '',
    FechaCreacion: nowIso()
  };
  appendRow(sheet_('Ventas'), registro);
  return registro;
}
