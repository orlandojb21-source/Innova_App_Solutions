function reportesResumen() {
  var ventas = sheetToObjectsActivos(sheet_('Ventas'));
  var gastos = sheetToObjectsActivos(sheet_('Gastos'));
  var clientes = sheetToObjectsActivos(sheet_('Clientes'));

  var meses = {};
  function celda_(clave) {
    if (!meses[clave]) meses[clave] = { ventas: 0, gastos: 0 };
    return meses[clave];
  }
  ventas.forEach(function (v) {
    var clave = Utilities.formatDate(new Date(v.Fecha), 'America/Panama', 'yyyy-MM');
    celda_(clave).ventas += Number(v.Monto || 0);
  });
  gastos.forEach(function (g) {
    var clave = Utilities.formatDate(new Date(g.Fecha), 'America/Panama', 'yyyy-MM');
    celda_(clave).gastos += Number(g.Monto || 0);
  });

  var porMes = Object.keys(meses).sort().reverse().slice(0, 12).map(function (clave) {
    var m = meses[clave];
    return {
      mes: clave,
      ventas: round2_(m.ventas),
      gastos: round2_(m.gastos),
      ganancia: round2_(m.ventas - m.gastos)
    };
  });

  var porCliente = {};
  ventas.forEach(function (v) {
    if (!v.ClienteId) return;
    porCliente[v.ClienteId] = (porCliente[v.ClienteId] || 0) + Number(v.Monto || 0);
  });
  var clientePorId = {};
  clientes.forEach(function (c) { clientePorId[c.Id] = c; });
  var topClientes = Object.keys(porCliente)
    .map(function (id) {
      return {
        ClienteId: id,
        Nombre: clientePorId[id] ? clientePorId[id].Nombre : '(cliente eliminado)',
        Total: round2_(porCliente[id])
      };
    })
    .sort(function (a, b) { return b.Total - a.Total; })
    .slice(0, 10);

  return { porMes: porMes, topClientes: topClientes };
}
