function proyectosListar() {
  var proyectos = sheetToObjects(sheet_('Proyectos'));
  return proyectos.sort(function (a, b) {
    return new Date(b.FechaCreacion) - new Date(a.FechaCreacion);
  });
}

function proyectosObtener(id) {
  if (!id) throw new Error('Falta el Id del proyecto.');
  var proyecto = sheetToObjects(sheet_('Proyectos')).filter(function (p) { return p.Id === id; })[0];
  if (!proyecto) throw new Error('Proyecto no encontrado.');
  proyecto.Entregables = entregablesDeProyecto_(id);
  return proyecto;
}

function entregablesDeProyecto_(proyectoId) {
  return sheetToObjects(sheet_('ProyectoEntregables')).filter(function (e) { return e.ProyectoId === proyectoId; });
}

function reemplazarEntregables_(proyectoId, entregables) {
  var sheet = sheet_('ProyectoEntregables');
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === proyectoId) sheet.deleteRow(i + 1);
  }
  (entregables || [])
    .filter(function (e) { return e.Titulo && String(e.Titulo).trim(); })
    .forEach(function (e) {
      appendRow(sheet, {
        Id: newId(),
        ProyectoId: proyectoId,
        Titulo: e.Titulo,
        Descripcion: e.Descripcion || '',
        Estado: e.Estado || 'Pendiente'
      });
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
      VentaId: datos.VentaId || '',
      Nombre: nombre,
      Descripcion: datos.Descripcion || '',
      Alcance: datos.Alcance || '',
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
    reemplazarEntregables_(registro.Id, datos.Entregables || []);
    registro.Entregables = entregablesDeProyecto_(registro.Id);
    return registro;
  });
}

function proyectosActualizar(id, cambios) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del proyecto.');
    cambios = cambios || {};
    var entregables = cambios.Entregables;
    delete cambios.Entregables;
    updateRowById(sheet_('Proyectos'), id, cambios);
    if (entregables !== undefined) {
      reemplazarEntregables_(id, entregables);
    }
    return { Id: id };
  });
}

function proyectosEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del proyecto.');
    deleteRowById(sheet_('Proyectos'), id);
    reemplazarEntregables_(id, []);
    return { Id: id };
  });
}
