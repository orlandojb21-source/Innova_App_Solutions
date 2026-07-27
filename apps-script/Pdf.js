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

  agregarEncabezadoDocumento_(body, config, 'COTIZACIÓN', [
    ['Folio', cot.Folio],
    ['Fecha', formatearFecha_(cot.Fecha)],
    ['Válido hasta', formatearFecha_(sumarDias_(cot.Fecha, cot.ValidezDias))]
  ]);
  agregarBarraSeccion_(body, 'CLIENTE');
  agregarDatosCliente_(body, cliente);
  body.appendParagraph(' ').setFontSize(6);
  agregarTablaItems_(body, cot.Items, moneda);
  agregarTotalesCotizacion_(body, cot, moneda);

  if (cot.Notas) {
    body.appendParagraph(' ').setFontSize(8);
    var pNotas = body.appendParagraph('Notas: ' + cot.Notas);
    pNotas.editAsText().setFontSize(9).setItalic(true).setForegroundColor('#555555');
  }

  return finalizarPdf_(doc, 'Cotizacion-' + cot.Folio + '.pdf');
}

function ventasGenerarFacturaPdf(ventaId) {
  var venta = sheetToObjects(sheet_('Ventas')).filter(function (v) { return v.Id === ventaId; })[0];
  if (!venta) throw new Error('Venta no encontrada.');
  if (venta.Estado !== 'Pagado') {
    throw new Error('Solo se puede generar la factura cuando la venta esté completamente pagada.');
  }
  if (!venta.FacturaFolio) {
    venta.FacturaFolio = withLock(function () { return asignarFolioFactura_(ventaId); });
  }

  var cliente = sheetToObjects(sheet_('Clientes')).filter(function (c) { return c.Id === venta.ClienteId; })[0] || {};
  var config = configObtener();
  var moneda = config.Moneda || '$';

  var doc = DocumentApp.create('Factura-' + venta.FacturaFolio + '-temp');
  var body = doc.getBody();
  body.setMarginTop(40).setMarginBottom(40).setMarginLeft(45).setMarginRight(45);

  agregarEncabezadoDocumento_(body, config, 'FACTURA', [
    ['Folio', venta.FacturaFolio],
    ['Fecha', formatearFecha_(venta.Fecha)],
    ['Estado', 'PAGADO']
  ]);
  agregarBarraSeccion_(body, 'CLIENTE');
  agregarDatosCliente_(body, cliente);
  body.appendParagraph(' ').setFontSize(6);
  agregarTablaItems_(body, [{
    Descripcion: venta.Concepto,
    Cantidad: 1,
    PrecioUnitario: venta.Monto,
    Subtotal: venta.Monto
  }], moneda);

  body.appendParagraph(' ').setFontSize(6);
  agregarLineaTotal_(body, 'TOTAL PAGADO', moneda + Number(venta.Monto).toFixed(2), true);

  return finalizarPdf_(doc, 'Factura-' + venta.FacturaFolio + '.pdf');
}

function ventasGenerarReciboPdf(abonoId) {
  var abono = sheetToObjects(sheet_('Abonos')).filter(function (a) { return a.Id === abonoId; })[0];
  if (!abono) throw new Error('Abono no encontrado.');
  var venta = sheetToObjects(sheet_('Ventas')).filter(function (v) { return v.Id === abono.VentaId; })[0];
  if (!venta) throw new Error('Venta no encontrada para este abono.');
  var cliente = sheetToObjects(sheet_('Clientes')).filter(function (c) { return c.Id === venta.ClienteId; })[0] || {};
  var config = configObtener();
  var moneda = config.Moneda || '$';

  var doc = DocumentApp.create('Recibo-' + abono.Folio + '-temp');
  var body = doc.getBody();
  body.setMarginTop(40).setMarginBottom(40).setMarginLeft(45).setMarginRight(45);

  agregarEncabezadoDocumento_(body, config, 'RECIBO', [
    ['Folio', abono.Folio],
    ['Fecha', formatearFecha_(abono.Fecha)]
  ]);
  agregarBarraSeccion_(body, 'CLIENTE');
  agregarDatosCliente_(body, cliente);
  body.appendParagraph(' ').setFontSize(8);

  var pRecibi = body.appendParagraph(
    'Recibí de ' + (cliente.Nombre || '—') + ' la suma de ' + moneda + Number(abono.Monto).toFixed(2) + ', por concepto de: ' + venta.Concepto + '.'
  );
  pRecibi.editAsText().setFontSize(11).setForegroundColor('#1a2233');

  var saldoRestante = round2_(Number(venta.Monto) - Number(venta.MontoPagado || 0));
  body.appendParagraph(' ').setFontSize(8);
  if (saldoRestante > 0) {
    agregarLineaTotal_(body, 'Saldo pendiente', moneda + saldoRestante.toFixed(2), false);
  } else {
    var pCompleto = body.appendParagraph('PAGADO EN SU TOTALIDAD');
    pCompleto.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    pCompleto.editAsText().setBold(true).setFontSize(13).setForegroundColor(COLOR_MARCA);
  }

  return finalizarPdf_(doc, 'Recibo-' + abono.Folio + '.pdf');
}

function proyectosGenerarPdf(proyectoId) {
  var proyecto = proyectosObtener(proyectoId);
  var cliente = sheetToObjects(sheet_('Clientes')).filter(function (c) { return c.Id === proyecto.ClienteId; })[0] || {};
  var venta = proyecto.VentaId
    ? sheetToObjects(sheet_('Ventas')).filter(function (v) { return v.Id === proyecto.VentaId; })[0]
    : null;
  var config = configObtener();

  var doc = DocumentApp.create('Alcance-' + proyecto.Nombre + '-temp');
  var body = doc.getBody();
  body.setMarginTop(40).setMarginBottom(40).setMarginLeft(45).setMarginRight(45);

  agregarEncabezadoDocumento_(body, config, 'ALCANCE DEL PROYECTO', [
    ['Proyecto', proyecto.Nombre],
    ['Fecha', formatearFecha_(nowIso())]
  ]);

  agregarBarraSeccion_(body, 'CLIENTE');
  agregarDatosCliente_(body, cliente);
  body.appendParagraph(' ').setFontSize(6);

  agregarBarraSeccion_(body, 'DETALLES DEL PROYECTO');
  body.appendParagraph(' ').setFontSize(4);
  [
    ['Stack / tecnologías', proyecto.Stack],
    ['Fecha de inicio', proyecto.FechaInicio ? formatearFecha_(proyecto.FechaInicio) : ''],
    ['Fecha de entrega', proyecto.FechaEntrega ? formatearFecha_(proyecto.FechaEntrega) : ''],
    ['Estado', proyecto.Estado],
    ['Facturación', venta ? (venta.FacturaFolio || venta.Concepto) + ' — ' + venta.Estado : '']
  ].forEach(function (par) {
    if (par[1]) lineaEtiquetaValor_(body, par[0], par[1]);
  });

  if (proyecto.Descripcion) {
    body.appendParagraph(' ').setFontSize(6);
    agregarBarraSeccion_(body, 'DESCRIPCIÓN');
    body.appendParagraph(' ').setFontSize(4);
    body.appendParagraph(proyecto.Descripcion).editAsText().setFontSize(10).setForegroundColor('#333333');
  }

  if (proyecto.Alcance) {
    body.appendParagraph(' ').setFontSize(6);
    agregarBarraSeccion_(body, 'ALCANCE');
    body.appendParagraph(' ').setFontSize(4);
    body.appendParagraph(proyecto.Alcance).editAsText().setFontSize(10).setForegroundColor('#333333');
  }

  if (proyecto.Entregables && proyecto.Entregables.length) {
    body.appendParagraph(' ').setFontSize(6);
    agregarBarraSeccion_(body, 'ENTREGABLES');
    body.appendParagraph(' ').setFontSize(4);
    agregarTablaEntregables_(body, proyecto.Entregables);
  }

  if (proyecto.Notas) {
    body.appendParagraph(' ').setFontSize(8);
    body.appendParagraph('Notas: ' + proyecto.Notas).editAsText().setFontSize(9).setItalic(true).setForegroundColor('#555555');
  }

  return finalizarPdf_(doc, 'Alcance-' + proyecto.Nombre + '.pdf');
}

/* ---------- Helpers compartidos de armado del documento ---------- */

function agregarEncabezadoDocumento_(body, config, titulo, lineasMeta) {
  insertarLogoCentrado_(body, config.LogoUrl);
  body.appendParagraph(' ').setFontSize(6);

  // Fila 1: nombre de la empresa (izq) alineado con el título del documento (der).
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
  textoTitulo.setText(titulo);
  textoTitulo.setBold(true).setFontSize(16).setForegroundColor(COLOR_MARCA);

  // Fila 2: tus datos (izq) + metadata del documento (der).
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
  lineasMeta.forEach(function (par) {
    lineaEtiquetaValor_(celdaMeta, par[0], par[1], DocumentApp.HorizontalAlignment.RIGHT);
  });
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

function agregarTablaItems_(body, items, moneda) {
  var filas = [['Descripción', 'Cant.', 'Precio unit.', 'Subtotal']];
  items.forEach(function (it) {
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

function agregarTablaEntregables_(body, entregables) {
  var filas = [['Entregable', 'Estado']];
  entregables.forEach(function (e) {
    filas.push([String(e.Descripcion), String(e.Estado || 'Pendiente')]);
  });

  var tabla = body.appendTable(filas);
  tabla.setBorderWidth(0.75);
  tabla.setBorderColor(COLOR_BORDE_TABLA);
  tabla.setColumnWidth(0, 400);
  tabla.setColumnWidth(1, 122);

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
      if (c === 1) {
        celda.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  }
}

function agregarTotalesCotizacion_(body, cot, moneda) {
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
    // Si el logo no carga, el documento se genera igual sin logo.
  }
}

function finalizarPdf_(doc, nombreArchivo) {
  doc.saveAndClose();
  var archivo = DriveApp.getFileById(doc.getId());
  var pdfBlob = archivo.getAs('application/pdf');
  pdfBlob.setName(nombreArchivo);
  archivo.setTrashed(true);
  return {
    nombreArchivo: pdfBlob.getName(),
    base64: Utilities.base64Encode(pdfBlob.getBytes())
  };
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
