var CATEGORIAS_GASTO = ['Herramientas y software', 'Dominios y hosting', 'Costo de cliente (traspasado)', 'Publicidad', 'Otro'];

function gastosListar() {
  var gastos = sheetToObjectsActivos(sheet_('Gastos'));
  return gastos.sort(function (a, b) { return new Date(b.Fecha) - new Date(a.Fecha); });
}

function gastosCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    if (!datos.Concepto || !String(datos.Concepto).trim()) throw new Error('Describe el concepto del gasto.');
    if (datos.Monto === undefined || datos.Monto === null || isNaN(Number(datos.Monto)) || Number(datos.Monto) <= 0) {
      throw new Error('El monto no es válido.');
    }
    var registro = {
      Id: newId(),
      Concepto: datos.Concepto,
      Categoria: CATEGORIAS_GASTO.indexOf(datos.Categoria) !== -1 ? datos.Categoria : 'Otro',
      Monto: round2_(datos.Monto),
      Fecha: datos.Fecha || nowIso(),
      ClienteId: datos.ClienteId || '',
      ProyectoId: datos.ProyectoId || '',
      Notas: datos.Notas || '',
      Eliminado: false,
      FechaEliminado: '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Gastos'), registro);
    return registro;
  });
}

function gastosActualizar(id, cambios) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del gasto.');
    cambios = cambios || {};
    if (cambios.Monto !== undefined) cambios.Monto = round2_(cambios.Monto);
    updateRowById(sheet_('Gastos'), id, cambios);
    return { Id: id };
  });
}

function gastosEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del gasto.');
    marcarEliminado_(sheet_('Gastos'), id);
    return { Id: id };
  });
}
