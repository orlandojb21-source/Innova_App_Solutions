/** yyyy-MM de una fecha, usando el mismo normalizador anti-desfase que el
 *  resto del backend (Sheets a veces entrega Date, a veces string). */
function claveMes_(fechaValor) {
  return normalizarFechaSoloDia_(fechaValor).slice(0, 7);
}

function reportesResumen() {
  var ventas = sheetToObjectsActivos(sheet_('Ventas'));
  var gastos = sheetToObjectsActivos(sheet_('Gastos'));
  var clientes = sheetToObjectsActivos(sheet_('Clientes'));
  var abonos = sheetToObjects(sheet_('Abonos'));

  var abonosPorVenta = {};
  abonos.forEach(function (a) {
    (abonosPorVenta[a.VentaId] = abonosPorVenta[a.VentaId] || []).push(a);
  });

  var meses = {};
  function celda_(clave) {
    if (!meses[clave]) meses[clave] = { ventas: 0, gastos: 0 };
    return meses[clave];
  }

  // El ingreso se cuenta en el mes en que el dinero realmente entró: cada
  // abono en su propia fecha, y lo que se pagó de una sola vez al crear la
  // venta (sin pasar por "Registrar abono") en la fecha de la venta. Así,
  // si el primer abono fue en julio y el pago final en agosto, cada mes
  // muestra solo lo que efectivamente cobraste ese mes.
  ventas.forEach(function (v) {
    var pagado = round2_(v.MontoPagado || 0);
    if (pagado <= 0) return;
    var abonosVenta = abonosPorVenta[v.Id] || [];
    var sumaAbonos = round2_(abonosVenta.reduce(function (acc, a) { return acc + Number(a.Monto || 0); }, 0));
    abonosVenta.forEach(function (a) {
      celda_(claveMes_(a.Fecha)).ventas += Number(a.Monto || 0);
    });
    var pagoDirecto = round2_(pagado - sumaAbonos);
    if (pagoDirecto > 0) {
      celda_(claveMes_(v.Fecha)).ventas += pagoDirecto;
    }
  });
  gastos.forEach(function (g) {
    celda_(claveMes_(g.Fecha)).gastos += Number(g.Monto || 0);
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
