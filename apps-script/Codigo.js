/**
 * Punto de entrada del Web App. Router único por "action"; toda acción
 * salvo auth.login exige un token de sesión válido. Respuesta siempre
 * { status: "success"|"error", data, message }.
 */

function doGet(e) { return manejarSolicitud_(e); }
function doPost(e) { return manejarSolicitud_(e); }

function manejarSolicitud_(e) {
  try {
    var params = obtenerParametros_(e);
    var action = params.action;
    if (!action) return errorResponse('Falta el parámetro action.');

    if (action === 'auth.login') {
      return okResponse(login(params.accessToken));
    }

    requireAuth(params.token);
    var datos = params.payload || {};

    switch (action) {
      case 'dashboard.resumen':
        return okResponse(dashboardResumen());

      case 'clientes.listar':
        return okResponse(clientesListar());
      case 'clientes.crear':
        return okResponse(clientesCrear(datos));
      case 'clientes.actualizar':
        return okResponse(clientesActualizar(datos.Id, datos.cambios));
      case 'clientes.eliminar':
        return okResponse(clientesEliminar(datos.Id));

      case 'cotizaciones.listar':
        return okResponse(cotizacionesListar());
      case 'cotizaciones.obtener':
        return okResponse(cotizacionesObtener(datos.Id));
      case 'cotizaciones.crear':
        return okResponse(cotizacionesCrear(datos));
      case 'cotizaciones.actualizar':
        return okResponse(cotizacionesActualizar(datos.Id, datos));
      case 'cotizaciones.cambiarEstado':
        return okResponse(cotizacionesCambiarEstado(datos.Id, datos.Estado));
      case 'cotizaciones.eliminar':
        return okResponse(cotizacionesEliminar(datos.Id));
      case 'cotizaciones.generarPdf':
        return okResponse(cotizacionesGenerarPdf(datos.Id));
      case 'cotizaciones.enviarPorCorreo':
        return okResponse(cotizacionesEnviarPorCorreo(datos.Id, datos.destinatario));

      case 'ventas.listar':
        return okResponse(ventasListar());
      case 'ventas.crear':
        return okResponse(ventasCrear(datos));
      case 'ventas.actualizar':
        return okResponse(ventasActualizar(datos.Id, datos.cambios));
      case 'ventas.eliminar':
        return okResponse(ventasEliminar(datos.Id));
      case 'ventas.crearDesdeCotizacion':
        return okResponse(ventasCrearDesdeCotizacion(datos.CotizacionId));
      case 'ventas.registrarAbono':
        return okResponse(ventasRegistrarAbono(datos.Id, datos.Monto));
      case 'ventas.generarFactura':
        return okResponse(ventasGenerarFacturaPdf(datos.Id));
      case 'ventas.generarRecibo':
        return okResponse(ventasGenerarReciboPdf(datos.AbonoId));

      case 'proyectos.listar':
        return okResponse(proyectosListar());
      case 'proyectos.obtener':
        return okResponse(proyectosObtener(datos.Id));
      case 'proyectos.crear':
        return okResponse(proyectosCrear(datos));
      case 'proyectos.actualizar':
        return okResponse(proyectosActualizar(datos.Id, datos.cambios));
      case 'proyectos.eliminar':
        return okResponse(proyectosEliminar(datos.Id));
      case 'proyectos.generarPdf':
        return okResponse(proyectosGenerarPdf(datos.Id));
      case 'proyectos.entregableActualizarEstado':
        return okResponse(entregablesActualizarEstado(datos.EntregableId, datos.Estado));
      case 'proyectos.entregableAgregar':
        return okResponse(entregablesAgregar(datos.ProyectoId, datos.Titulo));

      case 'suscripciones.listar':
        return okResponse(suscripcionesListar());
      case 'suscripciones.crear':
        return okResponse(suscripcionesCrear(datos));
      case 'suscripciones.actualizar':
        return okResponse(suscripcionesActualizar(datos.Id, datos.cambios));
      case 'suscripciones.eliminar':
        return okResponse(suscripcionesEliminar(datos.Id));
      case 'suscripciones.registrarPago':
        return okResponse(suscripcionesRegistrarPago(datos.Id));
      case 'suscripciones.alertas':
        return okResponse(suscripcionesAlertas());

      case 'config.obtener':
        return okResponse(configObtener());
      case 'config.guardar':
        return okResponse(configGuardar(datos));

      default:
        return errorResponse('Acción no reconocida: ' + action);
    }
  } catch (err) {
    return errorResponse(err && err.message ? err.message : 'Error inesperado en el servidor.');
  }
}

function obtenerParametros_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error('Cuerpo de la solicitud inválido (se esperaba JSON).');
    }
  }
  if (e && e.parameter) {
    var p = {};
    Object.keys(e.parameter).forEach(function (k) { p[k] = e.parameter[k]; });
    if (p.payload) {
      try { p.payload = JSON.parse(p.payload); } catch (err) { /* deja payload como string */ }
    }
    return p;
  }
  return {};
}

function dashboardResumen() {
  var cotizaciones = sheetToObjects(sheet_('Cotizaciones'));
  var ventas = sheetToObjects(sheet_('Ventas'));
  var proyectos = sheetToObjects(sheet_('Proyectos'));
  var clientes = sheetToObjects(sheet_('Clientes'));

  var hoy = new Date();
  var inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  var cotizacionesPendientes = cotizaciones.filter(function (c) {
    return c.Estado === 'Enviada' || c.Estado === 'Borrador';
  }).length;

  var ventasDelMes = ventas
    .filter(function (v) { return new Date(v.Fecha) >= inicioMes; })
    .reduce(function (acc, v) { return acc + Number(v.Monto || 0); }, 0);

  var ventasPendientesMonto = ventas
    .filter(function (v) { return v.Estado === 'Pendiente' || v.Estado === 'Parcial'; })
    .reduce(function (acc, v) { return acc + Number(v.Monto || 0); }, 0);

  var proyectosActivos = proyectos.filter(function (p) { return p.Estado === 'EnProgreso'; }).length;

  return {
    cotizacionesPendientes: cotizacionesPendientes,
    ventasDelMes: round2_(ventasDelMes),
    ventasPendientesMonto: round2_(ventasPendientesMonto),
    proyectosActivos: proyectosActivos,
    totalClientes: clientes.length,
    suscripcionesPorVencer: suscripcionesAlertas().length
  };
}
