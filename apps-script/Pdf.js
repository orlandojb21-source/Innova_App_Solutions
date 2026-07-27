function cotizacionesGenerarPdf(cotizacionId) {
  var cot = cotizacionesObtener(cotizacionId);
  var cliente = sheetToObjects(sheet_('Clientes')).filter(function (c) { return c.Id === cot.ClienteId; })[0] || {};
  var config = configObtener();
  var moneda = config.Moneda || '$';

  var doc = DocumentApp.create('Cotizacion-' + cot.Folio + '-temp');
  var body = doc.getBody();
  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(50).setMarginRight(50);

  insertarLogoSiExiste_(body, config.LogoUrl);

  body.appendParagraph(config.NombreEmpresa || 'Innova App Solutions').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  if (config.RUC) body.appendParagraph('RUC: ' + config.RUC);
  if (config.Direccion) body.appendParagraph(config.Direccion);
  var contacto = [config.Telefono, config.EmailContacto].filter(Boolean).join('  ·  ');
  if (contacto) body.appendParagraph(contacto);

  body.appendParagraph(' ');
  body.appendParagraph('Cotización ' + cot.Folio).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Fecha: ' + formatearFecha_(cot.Fecha) + '   ·   Válida por ' + cot.ValidezDias + ' días');

  body.appendParagraph(' ');
  body.appendParagraph('Cliente: ' + (cliente.Nombre || '—'));
  if (cliente.Empresa) body.appendParagraph('Empresa: ' + cliente.Empresa);
  if (cliente.Email) body.appendParagraph('Email: ' + cliente.Email);
  if (cliente.Telefono) body.appendParagraph('Teléfono: ' + cliente.Telefono);

  body.appendParagraph(' ');
  var tabla = [['Descripción', 'Cant.', 'Precio unit.', 'Subtotal']];
  cot.Items.forEach(function (it) {
    tabla.push([
      String(it.Descripcion),
      String(it.Cantidad),
      moneda + Number(it.PrecioUnitario).toFixed(2),
      moneda + Number(it.Subtotal).toFixed(2)
    ]);
  });
  body.appendTable(tabla);

  body.appendParagraph(' ');
  body.appendParagraph('Subtotal: ' + moneda + Number(cot.Subtotal).toFixed(2));
  if (Number(cot.DescuentoPct) > 0) body.appendParagraph('Descuento: ' + cot.DescuentoPct + '%');
  if (Number(cot.ImpuestoPct) > 0) body.appendParagraph('Impuesto: ' + cot.ImpuestoPct + '%');
  body.appendParagraph('Total: ' + moneda + Number(cot.Total).toFixed(2)).setBold(true);

  if (cot.Notas) {
    body.appendParagraph(' ');
    body.appendParagraph('Notas: ' + cot.Notas);
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

function insertarLogoSiExiste_(body, logoUrl) {
  if (!logoUrl) return;
  try {
    var resp = UrlFetchApp.fetch(logoUrl, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      var imagen = body.appendImage(resp.getBlob());
      imagen.setWidth(90).setHeight(90);
    }
  } catch (e) {
    // Si el logo no carga, la cotización se genera igual sin logo.
  }
}

function formatearFecha_(fechaIso) {
  return Utilities.formatDate(new Date(fechaIso), 'America/Panama', 'dd/MM/yyyy');
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
