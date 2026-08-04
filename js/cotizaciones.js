let _cacheCotizaciones = [];
let _cacheCotizacionesClientes = [];

const BADGES_COTIZACION = {
  Borrador: 'badge-gris',
  Enviada: 'badge-azul',
  Aceptada: 'badge-verde',
  Rechazada: 'badge-rojo'
};

async function renderCotizaciones(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header">
      <h2>Cotizaciones</h2>
      <button class="btn btn-primario" id="btn-nueva-cotizacion">+ Nueva cotización</button>
    </div>
    <div class="filtros">
      <select id="filtro-estado-cotizacion">
        <option value="">Todos los estados</option>
        <option value="Borrador">Borrador</option>
        <option value="Enviada">Enviada</option>
        <option value="Aceptada">Aceptada</option>
        <option value="Rechazada">Rechazada</option>
      </select>
    </div>
    <div class="tabla-wrap" id="tabla-cotizaciones"><div class="vacio">Cargando…</div></div>
  `;
  qs('#btn-nueva-cotizacion', contenedor).addEventListener('click', () => abrirFormularioCotizacion());
  qs('#filtro-estado-cotizacion', contenedor).addEventListener('change', (e) => pintarTablaCotizaciones(e.target.value));
  await cargarTablaCotizaciones(contenedor);
}

async function cargarTablaCotizaciones(contenedor) {
  try {
    const [cotizaciones, clientes, config] = await Promise.all([
      llamarApi('cotizaciones.listar'),
      obtenerClientesParaSelect(),
      llamarApi('config.obtener')
    ]);
    _cacheCotizaciones = cotizaciones;
    _cacheCotizacionesClientes = clientes;
    _monedaActual = config.Moneda || '$';
    pintarTablaCotizaciones('', contenedor);
  } catch (e) {
    qs('#tabla-cotizaciones', contenedor || document).innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

function pintarTablaCotizaciones(filtroEstado, contenedor) {
  const destino = qs('#tabla-cotizaciones', contenedor || document);
  const clientePorId = Object.fromEntries(_cacheCotizacionesClientes.map((c) => [c.Id, c]));
  const cotizaciones = filtroEstado ? _cacheCotizaciones.filter((c) => c.Estado === filtroEstado) : _cacheCotizaciones;
  if (!cotizaciones.length) {
    destino.innerHTML = '<div class="vacio">No hay cotizaciones registradas.</div>';
    return;
  }
  destino.innerHTML = `
    <table class="tabla">
      <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        ${cotizaciones.map((c) => {
          const cliente = clientePorId[c.ClienteId];
          return `
            <tr>
              <td>${esc(c.Folio)}</td>
              <td>${formatDate(c.Fecha)}</td>
              <td>${cliente ? esc(cliente.Nombre) : '—'}</td>
              <td>${formatMoney(c.Total, _monedaActual)}</td>
              <td>${badgeEstado(c.Estado, BADGES_COTIZACION)}</td>
              <td class="acciones-fila">
                <button class="btn btn-secundario btn-chico" data-ver-cotizacion="${esc(c.Id)}">Ver</button>
                <button class="btn btn-peligro btn-chico" data-eliminar-cotizacion="${esc(c.Id)}">Eliminar</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  qsa('[data-ver-cotizacion]', destino).forEach((btn) => {
    btn.addEventListener('click', () => abrirDetalleCotizacion(btn.dataset.verCotizacion));
  });
  qsa('[data-eliminar-cotizacion]', destino).forEach((btn) => {
    btn.addEventListener('click', () => eliminarCotizacion(btn.dataset.eliminarCotizacion));
  });
}

/* ---------- Formulario crear/editar ---------- */

function filaItemHtml(item) {
  const d = item || { Descripcion: '', Cantidad: 1, PrecioUnitario: 0 };
  return `
    <div class="fila-item" data-fila>
      <input type="text" class="item-desc" placeholder="Descripción" value="${esc(d.Descripcion)}">
      <input type="number" class="item-cant" min="0.01" step="0.01" value="${esc(d.Cantidad)}">
      <input type="number" class="item-precio" min="0" step="0.01" value="${esc(d.PrecioUnitario)}">
      <div class="subtotal-item">${formatMoney((Number(d.Cantidad) || 0) * (Number(d.PrecioUnitario) || 0), _monedaActual)}</div>
      <button type="button" class="quitar-item" title="Quitar ítem">×</button>
    </div>
  `;
}

async function abrirFormularioCotizacion(cotizacion) {
  const clientes = _cacheCotizacionesClientes.length ? _cacheCotizacionesClientes : await obtenerClientesParaSelect();
  const editando = !!cotizacion;
  const items = editando ? cotizacion.Items : [{ Descripcion: '', Cantidad: 1, PrecioUnitario: 0 }];

  abrirModal(`
    <h3>${editando ? 'Editar cotización ' + esc(cotizacion.Folio) : 'Nueva cotización'}</h3>
    <form id="form-cotizacion">
      <div class="form-grid">
        <div class="campo full">
          <label>Cliente *</label>
          <select name="ClienteId" required>
            <option value="">Selecciona un cliente…</option>
            ${clientes.map((c) => `<option value="${esc(c.Id)}" ${editando && cotizacion.ClienteId === c.Id ? 'selected' : ''}>${esc(c.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo"><label>Fecha</label><input type="date" name="Fecha" value="${esc(editando ? (cotizacion.Fecha || '').slice(0, 10) : new Date().toISOString().slice(0, 10))}"></div>
        <div class="campo"><label>Validez (días)</label><input type="number" min="1" name="ValidezDias" value="${esc(editando ? cotizacion.ValidezDias : 15)}"></div>
        <div class="campo"><label>Descuento (%)</label><input type="number" min="0" max="100" step="0.01" id="input-descuento" value="${esc(editando ? cotizacion.DescuentoPct : 0)}"></div>
        <div class="campo"><label>Impuesto (%)</label><input type="number" min="0" max="100" step="0.01" id="input-impuesto" value="${esc(editando ? cotizacion.ImpuestoPct : 0)}"></div>
      </div>

      <div class="campo full" style="margin-top:14px">
        <label>Ítems</label>
        <div class="items-cotizacion" id="items-container">
          ${items.map(filaItemHtml).join('')}
        </div>
        <button type="button" class="btn btn-secundario btn-chico" id="btn-agregar-item">+ Agregar ítem</button>
      </div>

      <div class="resumen-totales">
        <div>Subtotal: <span id="resumen-subtotal">${_monedaActual}0.00</span></div>
        <div class="total">Total: <span id="resumen-total">${_monedaActual}0.00</span></div>
      </div>

      <div class="campo full" style="margin-top:10px"><label>Notas</label><textarea name="Notas">${esc(cotizacion && cotizacion.Notas)}</textarea></div>

      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);

  const modal = qs('#modal-contenido');
  qs('#btn-agregar-item', modal).addEventListener('click', () => {
    qs('#items-container', modal).insertAdjacentHTML('beforeend', filaItemHtml());
    recalcularTotalesCotizacion(modal);
  });
  modal.addEventListener('input', (e) => {
    if (e.target.matches('.item-cant, .item-precio, #input-descuento, #input-impuesto')) {
      recalcularTotalesCotizacion(modal);
    }
  });
  modal.addEventListener('click', (e) => {
    if (e.target.matches('.quitar-item')) {
      const filas = qsa('[data-fila]', modal);
      if (filas.length > 1) {
        e.target.closest('[data-fila]').remove();
        recalcularTotalesCotizacion(modal);
      } else {
        mostrarToast('La cotización necesita al menos un ítem.', 'error');
      }
    }
  });
  recalcularTotalesCotizacion(modal);
  qs('#form-cotizacion', modal).addEventListener('submit', (e) => guardarCotizacion(e, editando ? cotizacion.Id : null));
}

function leerItemsDelFormulario(modal) {
  return qsa('[data-fila]', modal).map((fila) => ({
    Descripcion: qs('.item-desc', fila).value.trim(),
    Cantidad: Number(qs('.item-cant', fila).value),
    PrecioUnitario: Number(qs('.item-precio', fila).value)
  }));
}

function recalcularTotalesCotizacion(modal) {
  const items = leerItemsDelFormulario(modal);
  qsa('[data-fila]', modal).forEach((fila, i) => {
    const it = items[i];
    qs('.subtotal-item', fila).textContent = formatMoney((it.Cantidad || 0) * (it.PrecioUnitario || 0), _monedaActual);
  });
  const subtotal = items.reduce((acc, it) => acc + (Number(it.Cantidad) || 0) * (Number(it.PrecioUnitario) || 0), 0);
  const descuentoPct = Number(qs('#input-descuento', modal).value) || 0;
  const impuestoPct = Number(qs('#input-impuesto', modal).value) || 0;
  const base = subtotal - subtotal * (descuentoPct / 100);
  const total = base + base * (impuestoPct / 100);
  qs('#resumen-subtotal', modal).textContent = formatMoney(subtotal, _monedaActual);
  qs('#resumen-total', modal).textContent = formatMoney(total, _monedaActual);
}

async function guardarCotizacion(e, id) {
  e.preventDefault();
  const modal = qs('#modal-contenido');
  const btn = e.submitter || qs('button[type="submit"]', modal);
  const form = e.target;
  const datos = Object.fromEntries(new FormData(form).entries());
  datos.DescuentoPct = Number(qs('#input-descuento', modal).value) || 0;
  datos.ImpuestoPct = Number(qs('#input-impuesto', modal).value) || 0;
  datos.Items = leerItemsDelFormulario(modal).filter((it) => it.Descripcion);

  if (!datos.Items.length) {
    mostrarToast('Agrega al menos un ítem con descripción.', 'error');
    return;
  }

  btn.disabled = true;
  try {
    if (id) {
      await llamarApi('cotizaciones.actualizar', Object.assign({ Id: id }, datos));
    } else {
      await llamarApi('cotizaciones.crear', datos);
    }
    cerrarModal();
    mostrarToast('Cotización guardada.', 'exito');
    cargarTablaCotizaciones();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}

/* ---------- Detalle / acciones ---------- */

async function abrirDetalleCotizacion(id) {
  abrirModal('<div class="vacio">Cargando…</div>');
  try {
    const cot = await llamarApi('cotizaciones.obtener', { Id: id });
    const cliente = _cacheCotizacionesClientes.find((c) => c.Id === cot.ClienteId);

    abrirModal(`
      <h3>Cotización ${esc(cot.Folio)} ${badgeEstado(cot.Estado, BADGES_COTIZACION)}</h3>
      <p style="color:var(--texto-sub);font-size:13.5px;margin-top:-8px">
        ${cliente ? esc(cliente.Nombre) : 'Cliente no encontrado'} · ${formatDate(cot.Fecha)} · Válida ${esc(cot.ValidezDias)} días
      </p>

      <table class="tabla" style="margin:14px 0">
        <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
        <tbody>
          ${cot.Items.map((it) => `
            <tr>
              <td>${esc(it.Descripcion)}</td>
              <td>${esc(it.Cantidad)}</td>
              <td>${formatMoney(it.PrecioUnitario, _monedaActual)}</td>
              <td>${formatMoney(it.Subtotal, _monedaActual)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="resumen-totales">
        <div>Subtotal: ${formatMoney(cot.Subtotal, _monedaActual)}</div>
        ${Number(cot.DescuentoPct) > 0 ? `<div>Descuento: ${esc(cot.DescuentoPct)}%</div>` : ''}
        ${Number(cot.ImpuestoPct) > 0 ? `<div>Impuesto: ${esc(cot.ImpuestoPct)}%</div>` : ''}
        <div class="total">Total: ${formatMoney(cot.Total, _monedaActual)}</div>
      </div>

      ${cot.Notas ? `<p style="margin-top:14px"><strong>Notas:</strong> ${esc(cot.Notas)}</p>` : ''}

      <div class="modal-acciones" style="flex-wrap:wrap">
        <select id="select-cambiar-estado">
          ${['Borrador', 'Enviada', 'Aceptada', 'Rechazada'].map((op) => `<option value="${op}" ${cot.Estado === op ? 'selected' : ''}>${op}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-secundario btn-chico" id="btn-aplicar-estado">Cambiar estado</button>
        <button type="button" class="btn btn-secundario" id="btn-descargar-pdf">Descargar PDF</button>
        <button type="button" class="btn btn-secundario" id="btn-enviar-correo">Enviar por correo</button>
        <button type="button" class="btn btn-secundario" id="btn-editar-cotizacion">Editar</button>
        <button type="button" class="btn btn-peligro" data-cerrar-modal>Cerrar</button>
      </div>
    `);

    const modal = qs('#modal-contenido');
    qs('#btn-aplicar-estado', modal).addEventListener('click', () => cambiarEstadoCotizacion(cot.Id, qs('#select-cambiar-estado', modal).value));
    qs('#btn-descargar-pdf', modal).addEventListener('click', (e) => descargarPdfCotizacion(cot.Id, e.target));
    qs('#btn-enviar-correo', modal).addEventListener('click', (e) => enviarCorreoCotizacion(cot.Id, cliente, e.target));
    qs('#btn-editar-cotizacion', modal).addEventListener('click', () => abrirFormularioCotizacion(cot));
  } catch (e) {
    mostrarToast(e.message, 'error');
    cerrarModal();
  }
}

async function cambiarEstadoCotizacion(id, estado) {
  try {
    const resultado = await llamarApi('cotizaciones.cambiarEstado', { Id: id, Estado: estado });
    mostrarToast(
      resultado.ventaGenerada ? 'Estado actualizado. Se generó la venta en "Ventas".' : 'Estado actualizado.',
      'exito'
    );
    cerrarModal();
    cargarTablaCotizaciones();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}

async function descargarPdfCotizacion(id, btn) {
  btn.disabled = true;
  try {
    const pdf = await llamarApi('cotizaciones.generarPdf', { Id: id });
    descargarBase64(pdf.nombreArchivo, pdf.base64, 'application/pdf');
    mostrarToast('PDF generado.', 'exito');
  } catch (e) {
    mostrarToast(e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function enviarCorreoCotizacion(id, cliente, btn) {
  const destinatario = cliente && cliente.Email ? cliente.Email : prompt('Correo del destinatario:');
  if (!destinatario) return;
  btn.disabled = true;
  try {
    await llamarApi('cotizaciones.enviarPorCorreo', { Id: id, destinatario });
    mostrarToast('Cotización enviada por correo.', 'exito');
  } catch (e) {
    mostrarToast(e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}


async function eliminarCotizacion(id) {
  if (!confirm('¿Enviar esta cotización a la papelera? Podrás recuperarla después.')) return;
  try {
    await llamarApi('cotizaciones.eliminar', { Id: id });
    mostrarToast('Cotización movida a la papelera.', 'exito');
    cargarTablaCotizaciones();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}
