var COLOR_MARCA = '#0b1830';
var COLOR_FILA_PAR = '#f4f6fb';
var COLOR_BORDE_TABLA = '#d7dce5';
var ANCHO_CONTENIDO = 522; // pt, para márgenes de 45pt en página carta (612pt)

function cotizacionesGenerarPdf(cotizacionId) {
  var cot = cotizacionesObtener(cotizacionId);
  var cliente = sheetToObjects(sheet_('Clientes')).filter(function (c) { return c.Id === cot.ClienteId; })[0] || {};
  var config = configObtener();
  var moneda = config.Moneda || '$';

  var doc = DocumentApp.create('Cotizacion-' + cot.Folio + '-temp');
  var body = doc.getBody();
  body.setMarginTop(40).setMarginBottom(40).setMarginLeft(45).setMarginRight(45);

  agregarEncabezado_(body, cot, config, moneda);
  agregarBarraSeccion_(body, 'CLIENTE');
  agregarDatosCliente_(body, cliente);
  body.appendParagraph(' ').setFontSize(6);
  agregarTablaItems_(body, cot, moneda);
  agregarTotales_(body, cot, moneda);

  if (cot.Notas) {
    body.appendParagraph(' ').setFontSize(8);
    var pNotas = body.appendParagraph('Notas: ' + cot.Notas);
    pNotas.editAsText().setFontSize(9).setItalic(true).setForegroundColor('#555555');
  }

  doc.saveAndClose();

  var archivo = DriveApp.getFileById(doc.getId());
  var pdfBlob = archivo.getAs('application/pdf');
  pdfBlob.setName('Cotizacion-' + cot.Folio + '.pdf');
  archivo.setTrashed(true);

  return {
    nombreArchivo: pdfBlob.getName(),
    base64: Utilities.base64Encode(pdfBlob.getBytes())
  };
}

function agregarEncabezado_(body, cot, config, moneda) {
  insertarLogoCentrado_(body, config.LogoUrl);
  body.appendParagraph(' ').setFontSize(6);

  // Fila 1: nombre de la empresa (izq) alineado con "COTIZACIÓN" (der).
  var filaTitulo = body.appendTable([['', '']]);
  filaTitulo.setBorderWidth(0);
  filaTitulo.setColumnWidth(0, 320);
  filaTitulo.setColumnWidth(1, 202);

  var pEmpresa = filaTitulo.getCell(0, 0).getChild(0).asParagraph();
  var textoEmpresa = pEmpresa.editAsText();
  textoEmpresa.setText(config.NombreEmpresa || 'Innova App Solutions');
  textoEmpresa.setBold(true).setFontSize(16).setForegroundColor(COLOR_MARCA);

  var pTitulo = filaTitulo.getCell(0, 1).getChild(0).asParagraph();
  pTitulo.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  var textoTitulo = pTitulo.editAsText();
  textoTitulo.setText('COTIZACIÓN');
  textoTitulo.setBold(true).setFontSize(16).setForegroundColor(COLOR_MARCA);

  // Fila 2: tus datos (izq) + folio/fecha/validez (der).
  var filaDatos = body.appendTable([['', '']]);
  filaDatos.setBorderWidth(0);
  filaDatos.setColumnWidth(0, 320);
  filaDatos.setColumnWidth(1, 202);

  var celdaDatos = filaDatos.getCell(0, 0);
  var lineasDatos = [
    config.NombreFirmante,
    config.Cargo,
    config.Telefono,
    config.EmailContacto,
    config.Direccion,
    config.RUC ? 'RUC/Cédula: ' + config.RUC : ''
  ].filter(Boolean);
  lineasDatos.forEach(function (linea, i) {
    var parrafo = i === 0 ? celdaDatos.getChild(0).asParagraph() : celdaDatos.appendParagraph('');
    var texto = parrafo.editAsText();
    texto.setText(linea);
    texto.setFontSize(9.5).setForegroundColor('#444444');
  });

  var celdaMeta = filaDatos.getCell(0, 1);
  var textoVacio = celdaMeta.getChild(0).asParagraph().editAsText();
  textoVacio.setText(' ');
  textoVacio.setFontSize(4);
  lineaEtiquetaValor_(celdaMeta, 'Folio', cot.Folio, DocumentApp.HorizontalAlignment.RIGHT);
  lineaEtiquetaValor_(celdaMeta, 'Fecha', formatearFecha_(cot.Fecha), DocumentApp.HorizontalAlignment.RIGHT);
  lineaEtiquetaValor_(celdaMeta, 'Válido hasta', formatearFecha_(sumarDias_(cot.Fecha, cot.ValidezDias)), DocumentApp.HorizontalAlignment.RIGHT);
}

function lineaEtiquetaValor_(contenedor, etiqueta, valor, alineacion) {
  var texto = etiqueta + ': ' + valor;
  var p = contenedor.appendParagraph(texto);
  p.setAlignment(alineacion || DocumentApp.HorizontalAlignment.LEFT);
  var textoObj = p.editAsText();
  textoObj.setFontSize(9.5);
  textoObj.setBold(0, etiqueta.length - 1, true);
  textoObj.setForegroundColor(0, etiqueta.length - 1, COLOR_MARCA);
  return p;
}

function agregarBarraSeccion_(body, titulo) {
  var barra = body.appendTable([[titulo]]);
  barra.setBorderWidth(0);
  barra.setColumnWidth(0, ANCHO_CONTENIDO);
  var celda = barra.getCell(0, 0);
  celda.setBackgroundColor(COLOR_MARCA);
  celda.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(8);
  celda.editAsText().setBold(true).setFontSize(10).setForegroundColor('#ffffff');
}

function agregarDatosCliente_(body, cliente) {
  var p = body.appendParagraph(' ');
  p.setFontSize(4);
  [
    ['Nombre', cliente.Nombre],
    ['Empresa', cliente.Empresa],
    ['Email', cliente.Email],
    ['Teléfono', cliente.Telefono]
  ].forEach(function (par) {
    if (par[1]) lineaEtiquetaValor_(body, par[0], par[1]);
  });
}

function agregarTablaItems_(body, cot, moneda) {
  var filas = [['Descripción', 'Cant.', 'Precio unit.', 'Subtotal']];
  cot.Items.forEach(function (it) {
    filas.push([
      String(it.Descripcion),
      String(it.Cantidad),
      moneda + Number(it.PrecioUnitario).toFixed(2),
      moneda + Number(it.Subtotal).toFixed(2)
    ]);
  });

  var tabla = body.appendTable(filas);
  tabla.setBorderWidth(0.75);
  tabla.setBorderColor(COLOR_BORDE_TABLA);
  tabla.setColumnWidth(0, 232);
  tabla.setColumnWidth(1, 60);
  tabla.setColumnWidth(2, 115);
  tabla.setColumnWidth(3, 115);

  for (var f = 0; f < tabla.getNumRows(); f++) {
    var fila = tabla.getRow(f);
    var esEncabezado = f === 0;
    for (var c = 0; c < fila.getNumCells(); c++) {
      var celda = fila.getCell(c);
      celda.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(7).setPaddingRight(7);
      if (esEncabezado) {
        celda.setBackgroundColor(COLOR_MARCA);
        celda.editAsText().setBold(true).setForegroundColor('#ffffff').setFontSize(9.5);
      } else {
        celda.setBackgroundColor(f % 2 === 0 ? COLOR_FILA_PAR : '#ffffff');
        celda.editAsText().setFontSize(9.5).setForegroundColor('#1a2233');
      }
      if (c > 0) {
        celda.getChild(0).asParagraph().setAlignment(
          esEncabezado ? DocumentApp.HorizontalAlignment.CENTER : DocumentApp.HorizontalAlignment.RIGHT
        );
      }
    }
  }
}

function agregarTotales_(body, cot, moneda) {
  body.appendParagraph(' ').setFontSize(6);
  agregarLineaTotal_(body, 'Subtotal', moneda + Number(cot.Subtotal).toFixed(2), false);
  if (Number(cot.DescuentoPct) > 0) agregarLineaTotal_(body, 'Descuento', cot.DescuentoPct + '%', false);
  if (Number(cot.ImpuestoPct) > 0) agregarLineaTotal_(body, 'Impuesto', cot.ImpuestoPct + '%', false);
  agregarLineaTotal_(body, 'TOTAL', moneda + Number(cot.Total).toFixed(2), true);
}

function agregarLineaTotal_(body, etiqueta, valor, esTotal) {
  var p = body.appendParagraph(etiqueta + ':   ' + valor);
  p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  var textoObj = p.editAsText();
  if (esTotal) {
    textoObj.setBold(true).setFontSize(14).setForegroundColor(COLOR_MARCA);
  } else {
    textoObj.setFontSize(10).setForegroundColor('#444444');
  }
}

function insertarLogoCentrado_(body, logoUrl) {
  if (!logoUrl) return;
  try {
    var resp = UrlFetchApp.fetch(logoUrl, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      var parrafo = body.appendParagraph('');
      parrafo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      var imagen = parrafo.appendInlineImage(resp.getBlob());
      var proporcion = imagen.getHeight() / imagen.getWidth();
      imagen.setWidth(85);
      imagen.setHeight(Math.round(85 * proporcion));
    }
  } catch (e) {
    // Si el logo no carga, la cotización se genera igual sin logo.
  }
}

function formatearFecha_(fechaIso) {
  return Utilities.formatDate(new Date(fechaIso), 'America/Panama', 'dd/MM/yyyy');
}

function sumarDias_(fechaValor, dias) {
  // fechaValor puede llegar como Date (Sheets a veces devuelve un Date real,
  // no un string) o como texto "yyyy-MM-dd" — normalizamos por Utilities.formatDate
  // antes de sumar días, para no depender de un formato de entrada específico.
  var fechaBase = Utilities.formatDate(new Date(fechaValor), 'America/Panama', 'yyyy-MM-dd');
  var partes = fechaBase.split('-');
  var d = new Date(Date.UTC(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])));
  d.setUTCDate(d.getUTCDate() + Number(dias || 0));
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function cotizacionesEnviarPorCorreo(cotizacionId, destinatario) {
  var cot = cotizacionesObtener(cotizacionId);
  var cliente = sheetToObjects(sheet_('Clientes')).filter(function (c) { return c.Id === cot.ClienteId; })[0] || {};
  var para = destinatario || cliente.Email;
  if (!para) throw new Error('El cliente no tiene un correo registrado. Indica un destinatario manualmente.');
  var config = configObtener();
  var pdf = cotizacionesGenerarPdf(cotizacionId);
  var blob = Utilities.newBlob(Utilities.base64Decode(pdf.base64), 'application/pdf', pdf.nombreArchivo);
  var nombreEmpresa = config.NombreEmpresa || 'Innova App Solutions';

  GmailApp.sendEmail(
    para,
    'Cotización ' + cot.Folio + ' - ' + nombreEmpresa,
    'Hola,\n\nAdjunto encontrarás la cotización ' + cot.Folio + '.\n\nSaludos,\n' + nombreEmpresa,
    { attachments: [blob], name: nombreEmpresa }
  );

  return { enviado: true, para: para };
}
