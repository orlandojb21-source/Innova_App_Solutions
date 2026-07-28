/**
 * Ejecutar UNA SOLA VEZ desde el editor de Apps Script (seleccionar
 * configurarProyecto en el desplegable de funciones y pulsar "Ejecutar").
 * Crea el Google Sheet "IAS Panel DB" con todas las pestañas y guarda
 * SHEET_ID, ADMIN_EMAIL y SESSION_SECRET en las Propiedades del script.
 */
function configurarProyecto() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('SHEET_ID')) {
    throw new Error(
      'El proyecto ya fue configurado (ya existe SHEET_ID en Propiedades del script). ' +
      'Si de verdad quieres recrear la base de datos, borra esa propiedad manualmente primero.'
    );
  }

  var adminEmail = Session.getActiveUser().getEmail();
  if (!adminEmail) {
    throw new Error(
      'No se pudo detectar tu correo de Google automáticamente. Ejecuta esta función desde ' +
      'el editor de Apps Script con tu sesión de Google iniciada.'
    );
  }

  var ss = SpreadsheetApp.create('IAS Panel DB');

  var esquemas = {
    'Clientes': ['Id', 'Nombre', 'Empresa', 'Telefono', 'Email', 'Direccion', 'Notas', 'FechaCreacion'],
    'Cotizaciones': ['Id', 'Folio', 'ClienteId', 'Fecha', 'ValidezDias', 'Subtotal', 'DescuentoPct', 'ImpuestoPct', 'Total', 'Estado', 'Notas', 'FechaCreacion'],
    'CotizacionItems': ['Id', 'CotizacionId', 'Descripcion', 'Cantidad', 'PrecioUnitario', 'Subtotal'],
    'Ventas': ['Id', 'ClienteId', 'CotizacionId', 'Concepto', 'Monto', 'MontoPagado', 'FacturaFolio', 'Fecha', 'Estado', 'MetodoPago', 'Notas', 'FechaCreacion'],
    'Abonos': ['Id', 'VentaId', 'Folio', 'Monto', 'Fecha', 'FechaCreacion'],
    'Proyectos': ['Id', 'ClienteId', 'VentaId', 'Nombre', 'Descripcion', 'Alcance', 'Stack', 'FechaInicio', 'FechaEntrega', 'Estado', 'UrlRepo', 'UrlDemo', 'Notas', 'FechaCreacion'],
    'ProyectoEntregables': ['Id', 'ProyectoId', 'Titulo', 'Descripcion', 'Estado'],
    'Suscripciones': ['Id', 'ClienteId', 'ProyectoId', 'Producto', 'Monto', 'Frecuencia', 'FechaInicio', 'ProximoVencimiento', 'Estado', 'Notas', 'FechaCreacion'],
    'Soporte': ['Id', 'ClienteId', 'ProyectoId', 'Concepto', 'Alcance', 'Monto', 'Frecuencia', 'FechaInicio', 'ProximoVencimiento', 'Estado', 'Notas', 'FechaCreacion'],
    'Config': ['Clave', 'Valor']
  };

  var esPrimera = true;
  Object.keys(esquemas).forEach(function (nombre) {
    var sheet = esPrimera ? ss.getSheets()[0].setName(nombre) : ss.insertSheet(nombre);
    esPrimera = false;
    var headers = esquemas[nombre];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });

  var configSheet = ss.getSheetByName('Config');
  var valoresPorDefecto = [
    ['NombreEmpresa', 'Innova App Solutions'],
    ['RUC', ''],
    ['Direccion', ''],
    ['Telefono', ''],
    ['EmailContacto', adminEmail],
    ['Moneda', '$'],
    ['ImpuestoPctDefault', '0'],
    ['LogoUrl', '']
  ];
  configSheet.getRange(2, 1, valoresPorDefecto.length, 2).setValues(valoresPorDefecto);

  props.setProperties({
    SHEET_ID: ss.getId(),
    ADMIN_EMAIL: adminEmail,
    SESSION_SECRET: Utilities.getUuid() + Utilities.getUuid()
  });

  Logger.log('Listo. Hoja creada: ' + ss.getUrl());
  Logger.log('Cuenta con acceso a la app: ' + adminEmail);
  Logger.log('Siguiente paso: Implementar > Nueva implementación > Aplicación web, y configurar LogoUrl en la pestaña Config una vez publicada la app en Vercel.');
}

/**
 * Migración de un solo uso: agrega la pestaña "Suscripciones" a un Sheet
 * que ya fue creado por configurarProyecto() antes de que este módulo
 * existiera. No afecta ninguna pestaña ni dato existente. Es seguro
 * ejecutarla más de una vez (si la pestaña ya existe, no hace nada).
 */
function agregarModuloSuscripciones() {
  var ss = ss_();
  if (ss.getSheetByName('Suscripciones')) {
    Logger.log('La pestaña Suscripciones ya existe, no se hizo ningún cambio.');
    return;
  }
  var headers = ['Id', 'ClienteId', 'ProyectoId', 'Producto', 'Monto', 'Frecuencia', 'FechaInicio', 'ProximoVencimiento', 'Estado', 'Notas', 'FechaCreacion'];
  var sheet = ss.insertSheet('Suscripciones');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  Logger.log('Listo. Pestaña Suscripciones creada en: ' + ss.getUrl());
}

/**
 * Migración de un solo uso: agrega la columna "ProyectoId" a la pestaña
 * Suscripciones para poder vincular cada suscripción a uno de tus
 * proyectos (útil para las apps multi-tenant que vendes por licencia).
 * No afecta filas existentes. Segura de ejecutar más de una vez.
 */
function agregarProyectoASuscripciones() {
  var sheet = sheet_('Suscripciones');
  var headers = headers_(sheet);
  if (headers.indexOf('ProyectoId') !== -1) {
    Logger.log('La columna ProyectoId ya existe, no se hizo ningún cambio.');
    return;
  }
  sheet.getRange(1, headers.length + 1).setValue('ProyectoId');
  Logger.log('Listo. Columna ProyectoId agregada a Suscripciones.');
}

/**
 * Migración de un solo uso: agrega la columna "MontoPagado" a Ventas para
 * poder registrar abonos parciales (ej. 50% al iniciar un proyecto y 50%
 * al entregarlo). Rellena las ventas existentes: las que ya están en
 * "Pagado" quedan con MontoPagado = Monto; el resto en 0 — si tienes
 * ventas en "Parcial" de antes de este cambio, revísalas y corrige el
 * abono a mano una vez creada la columna. No afecta ninguna fila más.
 */
function agregarMontoPagadoAVentas() {
  var sheet = sheet_('Ventas');
  var headers = headers_(sheet);
  if (headers.indexOf('MontoPagado') !== -1) {
    Logger.log('La columna MontoPagado ya existe, no se hizo ningún cambio.');
    return;
  }

  var nuevaCol = headers.length + 1;
  sheet.getRange(1, nuevaCol).setValue('MontoPagado');

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var idxEstado = headers.indexOf('Estado');
    var idxMonto = headers.indexOf('Monto');
    var datos = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    var columna = datos.map(function (fila) {
      return [fila[idxEstado] === 'Pagado' ? fila[idxMonto] : 0];
    });
    sheet.getRange(2, nuevaCol, columna.length, 1).setValues(columna);
  }

  Logger.log('Listo. Columna MontoPagado agregada. Revisa manualmente las ventas que estén en estado Parcial.');
}

function agregarColumnaSiNoExiste_(nombreSheet, nombreColumna) {
  var sheet = sheet_(nombreSheet);
  var headers = headers_(sheet);
  if (headers.indexOf(nombreColumna) !== -1) {
    Logger.log('La columna ' + nombreColumna + ' ya existe en ' + nombreSheet + ', no se hizo ningún cambio.');
    return;
  }
  sheet.getRange(1, headers.length + 1).setValue(nombreColumna);
  Logger.log('Listo. Columna ' + nombreColumna + ' agregada a ' + nombreSheet + '.');
}

function crearPestanaSiNoExiste_(nombreSheet, headers) {
  var ss = ss_();
  if (ss.getSheetByName(nombreSheet)) {
    Logger.log('La pestaña ' + nombreSheet + ' ya existe, no se hizo ningún cambio.');
    return;
  }
  var sheet = ss.insertSheet(nombreSheet);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  Logger.log('Listo. Pestaña ' + nombreSheet + ' creada.');
}

/**
 * Migración de un solo uso: crea la pestaña "Abonos" (historial de cada
 * pago parcial registrado en Ventas, con su propio folio para el recibo).
 */
function agregarTablaAbonos() {
  crearPestanaSiNoExiste_('Abonos', ['Id', 'VentaId', 'Folio', 'Monto', 'Fecha', 'FechaCreacion']);
}

/**
 * Migración de un solo uso: agrega la columna "FacturaFolio" a Ventas.
 * Queda vacía hasta que generes la factura de esa venta por primera vez
 * (solo se puede generar cuando la venta está completamente pagada).
 */
function agregarFacturaFolioAVentas() {
  agregarColumnaSiNoExiste_('Ventas', 'FacturaFolio');
}

/**
 * Migración de un solo uso: agrega la columna "Alcance" a Proyectos y crea
 * la pestaña "ProyectoEntregables", para poder generar un PDF de alcance
 * y entregables por proyecto.
 */
function agregarAlcanceYEntregablesAProyectos() {
  agregarColumnaSiNoExiste_('Proyectos', 'Alcance');
  crearPestanaSiNoExiste_('ProyectoEntregables', ['Id', 'ProyectoId', 'Descripcion', 'Estado']);
}

/**
 * Migración de un solo uso: agrega la columna "VentaId" a Proyectos, para
 * poder vincular un proyecto con la venta/factura que lo está pagando.
 */
function agregarVentaAProyectos() {
  agregarColumnaSiNoExiste_('Proyectos', 'VentaId');
}

/**
 * Migración de un solo uso: agrega la columna "Titulo" a
 * ProyectoEntregables, para separar un título corto del detalle
 * (que sigue viviendo en la columna "Descripcion").
 */
function agregarTituloAEntregables() {
  agregarColumnaSiNoExiste_('ProyectoEntregables', 'Titulo');
}

/**
 * Migración de un solo uso: crea la pestaña "Soporte" (contratos de
 * soporte/mantenimiento recurrentes, con la misma mecánica de cobro y
 * alertas que Suscripciones).
 */
function agregarModuloSoporte() {
  crearPestanaSiNoExiste_('Soporte', ['Id', 'ClienteId', 'ProyectoId', 'Concepto', 'Alcance', 'Monto', 'Frecuencia', 'FechaInicio', 'ProximoVencimiento', 'Estado', 'Notas', 'FechaCreacion']);
}
