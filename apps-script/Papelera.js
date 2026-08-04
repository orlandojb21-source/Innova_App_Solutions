var ENTIDADES_PAPELERA = [
  { tipo: 'Cliente', sheet: 'Clientes', campoLabel: 'Nombre' },
  { tipo: 'Cotización', sheet: 'Cotizaciones', campoLabel: 'Folio' },
  { tipo: 'Venta', sheet: 'Ventas', campoLabel: 'Concepto' },
  { tipo: 'Proyecto', sheet: 'Proyectos', campoLabel: 'Nombre' },
  { tipo: 'Suscripción', sheet: 'Suscripciones', campoLabel: 'Producto' },
  { tipo: 'Soporte', sheet: 'Soporte', campoLabel: 'Concepto' },
  { tipo: 'Gasto', sheet: 'Gastos', campoLabel: 'Concepto' }
];

function sheetsValidosPapelera_() {
  return ENTIDADES_PAPELERA.map(function (e) { return e.sheet; });
}

function papeleraListar() {
  var resultados = [];
  ENTIDADES_PAPELERA.forEach(function (def) {
    var filas = sheetToObjects(sheet_(def.sheet)).filter(function (r) { return r.Eliminado === true; });
    filas.forEach(function (fila) {
      resultados.push({
        Tipo: def.tipo,
        Sheet: def.sheet,
        Id: fila.Id,
        Etiqueta: fila[def.campoLabel] || '(sin nombre)',
        FechaEliminado: fila.FechaEliminado || ''
      });
    });
  });
  resultados.sort(function (a, b) { return new Date(b.FechaEliminado) - new Date(a.FechaEliminado); });
  return resultados;
}

function papeleraRestaurar(sheetNombre, id) {
  return withLock(function () {
    if (sheetsValidosPapelera_().indexOf(sheetNombre) === -1) throw new Error('Tipo de registro inválido.');
    if (!id) throw new Error('Falta el Id del registro.');
    restaurarEliminado_(sheet_(sheetNombre), id);
    return { Id: id };
  });
}

function papeleraEliminarDefinitivo(sheetNombre, id) {
  return withLock(function () {
    if (sheetsValidosPapelera_().indexOf(sheetNombre) === -1) throw new Error('Tipo de registro inválido.');
    if (!id) throw new Error('Falta el Id del registro.');
    deleteRowById(sheet_(sheetNombre), id);
    if (sheetNombre === 'Cotizaciones') reemplazarItems_(id, []);
    if (sheetNombre === 'Proyectos') reemplazarEntregables_(id, []);
    return { Id: id };
  });
}
