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
    'Ventas': ['Id', 'ClienteId', 'CotizacionId', 'Concepto', 'Monto', 'Fecha', 'Estado', 'MetodoPago', 'Notas', 'FechaCreacion'],
    'Proyectos': ['Id', 'ClienteId', 'Nombre', 'Descripcion', 'Stack', 'FechaInicio', 'FechaEntrega', 'Estado', 'UrlRepo', 'UrlDemo', 'Notas', 'FechaCreacion'],
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
