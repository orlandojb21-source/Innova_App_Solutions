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
  var tabla = body.appendTable([['', '']]);
  tabla.setBorderWidth(0);
  tabla.setColumnWidth(0, 320);
  tabla.setColumnWidth(1, 202);

  var celdaEmpresa = tabla.getCell(0, 0);
  insertarLogoEnCelda_(celdaEmpresa, config.LogoUrl);
  var pNombre = celdaEmpresa.appendParagraph(config.NombreEmpresa || 'Innova App Solutions');
  pNombre.editAsText().setBold(true).setFontSize(15).setForegroundColor(COLOR_MARCA);
  var firmante = [config.NombreFirmante, config.Cargo].filter(Boolean).join(' — ');
  if (firmante) {
    celdaEmpresa.appendParagraph(firmante).editAsText().setFontSize(10).setBold(true).setForegroundColor('#333333');
  }
  [
    config.Direccion,
    [config.Telefono, config.EmailContacto].filter(Boolean).join('   ·   '),
    config.RUC ? 'RUC/Cédula: ' + config.RUC : ''
  ].filter(Boolean).forEach(function (linea) {
    celdaEmpresa.appendParagraph(linea).editAsText().setFontSize(9).setForegroundColor('#444444');
  });

  var celdaMeta = tabla.getCell(0, 1);
  var pTitulo = celdaMeta.appendParagraph('COTIZACIÓN');
  pTitulo.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  pTitulo.editAsText().setBold(true).setFontSize(19).setForegroundColor(COLOR_MARCA);

  celdaMeta.appendParagraph(' ').setFontSize(4);
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

function insertarLogoEnCelda_(celda, logoUrl) {
  if (!logoUrl) return;
  try {
    var resp = UrlFetchApp.fetch(logoUrl, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      var imagen = celda.appendImage(resp.getBlob());
      var proporcion = imagen.getHeight() / imagen.getWidth();
      imagen.setWidth(46);
      imagen.setHeight(Math.round(46 * proporcion));
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
