function proyectosListar() {
  var proyectos = sheetToObjects(sheet_('Proyectos'));
  return proyectos.sort(function (a, b) {
    return new Date(b.FechaCreacion) - new Date(a.FechaCreacion);
  });
}

function proyectosCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    var nombre = (datos.Nombre || '').trim();
    if (!nombre) throw new Error('El nombre del proyecto es obligatorio.');
    var registro = {
      Id: newId(),
      ClienteId: datos.ClienteId || '',
      Nombre: nombre,
      Descripcion: datos.Descripcion || '',
      Stack: datos.Stack || '',
      FechaInicio: datos.FechaInicio || '',
      FechaEntrega: datos.FechaEntrega || '',
      Estado: datos.Estado || 'EnProgreso',
      UrlRepo: datos.UrlRepo || '',
      UrlDemo: datos.UrlDemo || '',
      Notas: datos.Notas || '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Proyectos'), registro);
    return registro;
  });
}

function proyectosActualizar(id, cambios) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del proyecto.');
    updateRowById(sheet_('Proyectos'), id, cambios);
    return { Id: id };
  });
}

function proyectosEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del proyecto.');
    deleteRowById(sheet_('Proyectos'), id);
    return { Id: id };
  });
}
