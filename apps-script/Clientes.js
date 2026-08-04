function clientesListar() {
  return sheetToObjectsActivos(sheet_('Clientes'));
}

function clientesCrear(datos) {
  return withLock(function () {
    datos = datos || {};
    var nombre = (datos.Nombre || '').trim();
    if (!nombre) throw new Error('El nombre del cliente es obligatorio.');
    var registro = {
      Id: newId(),
      Nombre: nombre,
      Empresa: datos.Empresa || '',
      Telefono: datos.Telefono || '',
      Email: datos.Email || '',
      Direccion: datos.Direccion || '',
      Notas: datos.Notas || '',
      FechaCreacion: nowIso()
    };
    appendRow(sheet_('Clientes'), registro);
    return registro;
  });
}

function clientesActualizar(id, cambios) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del cliente.');
    updateRowById(sheet_('Clientes'), id, cambios);
    return { Id: id };
  });
}

function clientesEliminar(id) {
  return withLock(function () {
    if (!id) throw new Error('Falta el Id del cliente.');
    marcarEliminado_(sheet_('Clientes'), id);
    return { Id: id };
  });
}
