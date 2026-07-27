let _cacheProyectos = [];

const BADGES_PROYECTO = { EnProgreso: 'badge-azul', Completado: 'badge-verde', Pausado: 'badge-gris' };
const BADGES_ENTREGABLE = { Pendiente: 'badge-naranja', Entregado: 'badge-verde' };

async function renderProyectos(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header">
      <h2>Proyectos realizados</h2>
      <button class="btn btn-primario" id="btn-nuevo-proyecto">+ Nuevo proyecto</button>
    </div>
    <div id="lista-proyectos"><div class="vacio">Cargando…</div></div>
  `;
  qs('#btn-nuevo-proyecto', contenedor).addEventListener('click', () => abrirFormularioProyecto());
  await cargarListaProyectos(contenedor);
}

async function cargarListaProyectos(contenedor) {
  const destino = qs('#lista-proyectos', contenedor || document);
  try {
    const [proyectos, clientes, ventas] = await Promise.all([
      llamarApi('proyectos.listar'),
      obtenerClientesParaSelect(),
      llamarApi('ventas.listar')
    ]);
    _cacheProyectos = proyectos;
    if (!proyectos.length) {
      destino.innerHTML = '<div class="vacio">Todavía no has registrado proyectos.</div>';
      return;
    }
    const clientePorId = Object.fromEntries(clientes.map((c) => [c.Id, c]));
    destino.innerHTML = `
      <div class="grid-proyectos">
        ${proyectos.map((p) => {
          const cliente = clientePorId[p.ClienteId];
          return `
            <div class="tarjeta-proyecto">
              <h4>${esc(p.Nombre)}</h4>
              <div class="cliente-proyecto">${cliente ? esc(cliente.Nombre) : 'Sin cliente asociado'}</div>
              ${badgeEstado(p.Estado, BADGES_PROYECTO)}
              ${p.EntregablesTotal > 0 ? `<div class="cliente-proyecto">Entregables: ${p.EntregablesHechos}/${p.EntregablesTotal}</div>` : ''}
              <div class="acciones-fila" style="margin-top:12px">
                <button class="btn btn-primario btn-chico" data-ver-proyecto="${esc(p.Id)}">Vista general</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    qsa('[data-ver-proyecto]', destino).forEach((btn) => {
      btn.addEventListener('click', () => abrirDetalleProyecto(btn.dataset.verProyecto, clientes, ventas));
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

async function abrirDetalleProyecto(id, clientes, ventas) {
  abrirModal('<div class="vacio">Cargando…</div>');
  try {
    const proyecto = await llamarApi('proyectos.obtener', { Id: id });
    const cliente = clientes.find((c) => c.Id === proyecto.ClienteId);
    const venta = ventas.find((v) => v.Id === proyecto.VentaId);

    abrirModal(`
      <h3>${esc(proyecto.Nombre)} ${badgeEstado(proyecto.Estado, BADGES_PROYECTO)}</h3>
      <p style="color:var(--texto-sub);font-size:13.5px;margin-top:-8px">
        ${cliente ? esc(cliente.Nombre) : 'Sin cliente asociado'}
      </p>

      ${proyecto.Stack ? `<p><strong>Stack:</strong> ${esc(proyecto.Stack)}</p>` : ''}
      ${(proyecto.FechaInicio || proyecto.FechaEntrega) ? `<p><strong>Fechas:</strong> ${proyecto.FechaInicio ? formatDate(proyecto.FechaInicio) : '—'} → ${proyecto.FechaEntrega ? formatDate(proyecto.FechaEntrega) : '—'}</p>` : ''}
      ${venta ? `<p><strong>Facturación:</strong> ${esc(venta.FacturaFolio || venta.Concepto)} · ${badgeEstado(venta.Estado, BADGES_VENTA)}</p>` : ''}
      ${(proyecto.UrlRepo || proyecto.UrlDemo) ? `
        <div class="enlaces" style="margin:8px 0">
          ${proyecto.UrlRepo ? `<a href="${esc(proyecto.UrlRepo)}" target="_blank" rel="noopener">Repositorio</a>` : ''}
          ${proyecto.UrlDemo ? `<a href="${esc(proyecto.UrlDemo)}" target="_blank" rel="noopener">Demo</a>` : ''}
        </div>
      ` : ''}

      ${proyecto.Descripcion ? `<p style="margin-top:12px"><strong>Descripción</strong><br>${esc(proyecto.Descripcion)}</p>` : ''}
      ${proyecto.Alcance ? `<p style="margin-top:12px"><strong>Alcance</strong><br>${esc(proyecto.Alcance)}</p>` : ''}

      <div style="margin-top:12px">
        <strong>Entregables${proyecto.Entregables && proyecto.Entregables.length ? ` (${proyecto.Entregables.filter((e) => e.Estado === 'Entregado').length}/${proyecto.Entregables.length})` : ''}</strong>
        ${(proyecto.Entregables && proyecto.Entregables.length) ? `
          <table class="tabla" style="margin-top:6px">
            <thead><tr><th>Entregable</th><th></th></tr></thead>
            <tbody>
              ${proyecto.Entregables.map((e) => `
                <tr>
                  <td>
                    <strong>${esc(e.Titulo)}</strong>
                    ${e.Descripcion ? `<div style="color:var(--texto-sub);font-size:12.5px;margin-top:2px">${esc(e.Descripcion)}</div>` : ''}
                  </td>
                  <td style="text-align:right">
                    ${badgeEstado(e.Estado, BADGES_ENTREGABLE)}<br>
                    <button type="button" class="btn btn-secundario btn-chico" style="margin-top:4px" data-toggle-entregable="${esc(e.Id)}" data-estado-actual="${esc(e.Estado)}">${e.Estado === 'Entregado' ? 'Marcar pendiente' : 'Marcar entregado'}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `<p class="vacio" style="padding:14px 0">Todavía no hay entregables.</p>`}

        <form id="form-entregable-rapido" style="display:flex;gap:8px;margin-top:8px">
          <input type="text" name="TituloRapido" placeholder="Título del nuevo entregable" style="flex:1" required>
          <button type="submit" class="btn btn-secundario btn-chico">+ Agregar</button>
        </form>
      </div>

      ${proyecto.Notas ? `<p style="margin-top:12px"><strong>Notas:</strong> ${esc(proyecto.Notas)}</p>` : ''}

      <div class="modal-acciones" style="flex-wrap:wrap">
        <button type="button" class="btn btn-secundario" id="btn-descargar-proyecto-detalle">Descargar PDF</button>
        <button type="button" class="btn btn-secundario" id="btn-editar-proyecto-detalle">Editar</button>
        <button type="button" class="btn btn-peligro" id="btn-eliminar-proyecto-detalle">Eliminar</button>
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cerrar</button>
      </div>
    `);

    const modal = qs('#modal-contenido');
    qs('#btn-descargar-proyecto-detalle', modal).addEventListener('click', (e) => descargarPdfProyecto(proyecto.Id, e.target));
    qs('#btn-editar-proyecto-detalle', modal).addEventListener('click', () => abrirFormularioProyecto(proyecto, clientes, ventas));
    qs('#btn-eliminar-proyecto-detalle', modal).addEventListener('click', () => eliminarProyecto(proyecto.Id));
    qsa('[data-toggle-entregable]', modal).forEach((btn) => {
      btn.addEventListener('click', () => alternarEstadoEntregable(btn.dataset.toggleEntregable, btn.dataset.estadoActual, proyecto.Id, clientes, ventas));
    });
    qs('#form-entregable-rapido', modal).addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.elements.TituloRapido;
      agregarEntregableRapido(proyecto.Id, input.value, clientes, ventas);
    });
  } catch (e) {
    mostrarToast(e.message, 'error');
    cerrarModal();
  }
}

async function alternarEstadoEntregable(entregableId, estadoActual, proyectoId, clientes, ventas) {
  const nuevoEstado = estadoActual === 'Entregado' ? 'Pendiente' : 'Entregado';
  try {
    await llamarApi('proyectos.entregableActualizarEstado', { EntregableId: entregableId, Estado: nuevoEstado });
    cargarListaProyectos();
    abrirDetalleProyecto(proyectoId, clientes, ventas);
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}

async function agregarEntregableRapido(proyectoId, titulo, clientes, ventas) {
  if (!titulo || !titulo.trim()) {
    mostrarToast('Escribe un título para el entregable.', 'error');
    return;
  }
  try {
    await llamarApi('proyectos.entregableAgregar', { ProyectoId: proyectoId, Titulo: titulo.trim() });
    mostrarToast('Entregable agregado.', 'exito');
    cargarListaProyectos();
    abrirDetalleProyecto(proyectoId, clientes, ventas);
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}

function filaEntregableHtml(entregable) {
  const e = entregable || { Titulo: '', Descripcion: '', Estado: 'Pendiente' };
  return `
    <div class="entregable-caja" data-fila-entregable>
      <div class="entregable-fila-superior">
        <input type="text" class="entregable-titulo" placeholder="Título del entregable" value="${esc(e.Titulo)}">
        <select class="entregable-estado">
          <option value="Pendiente" ${e.Estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="Entregado" ${e.Estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
        </select>
        <button type="button" class="quitar-item" title="Quitar entregable">×</button>
      </div>
      <textarea class="entregable-detalle" placeholder="Detalle de este entregable">${esc(e.Descripcion)}</textarea>
    </div>
  `;
}

async function abrirFormularioProyecto(proyecto, clientesPrecargados, ventasPrecargadas) {
  const clientes = clientesPrecargados || await obtenerClientesParaSelect();
  const ventas = ventasPrecargadas || await llamarApi('ventas.listar').catch(() => []);
  const editando = !!proyecto;
  const entregables = (editando && proyecto.Entregables && proyecto.Entregables.length) ? proyecto.Entregables : [{ Titulo: '', Descripcion: '', Estado: 'Pendiente' }];

  abrirModal(`
    <h3>${editando ? 'Editar proyecto' : 'Nuevo proyecto'}</h3>
    <form id="form-proyecto">
      <div class="form-grid">
        <div class="campo full"><label>Nombre *</label><input name="Nombre" required value="${esc(proyecto && proyecto.Nombre)}"></div>
        <div class="campo full">
          <label>Cliente</label>
          <select name="ClienteId">
            <option value="">— Sin cliente asociado —</option>
            ${clientes.map((c) => `<option value="${esc(c.Id)}" ${proyecto && proyecto.ClienteId === c.Id ? 'selected' : ''}>${esc(c.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full">
          <label>Venta / factura vinculada (opcional)</label>
          <select name="VentaId">
            <option value="">— Ninguna —</option>
            ${ventas.map((v) => `<option value="${esc(v.Id)}" ${proyecto && proyecto.VentaId === v.Id ? 'selected' : ''}>${esc(v.Concepto)} — ${formatMoney(v.Monto, _monedaActual)} (${esc(v.Estado)})</option>`).join('')}
          </select>
        </div>
        <div class="campo"><label>Estado</label>
          <select name="Estado">
            ${['EnProgreso', 'Completado', 'Pausado'].map((op) => `<option value="${op}" ${proyecto && proyecto.Estado === op ? 'selected' : ''}>${op}</option>`).join('')}
          </select>
        </div>
        <div class="campo"><label>Stack / tecnologías</label><input name="Stack" value="${esc(proyecto && proyecto.Stack)}"></div>
        <div class="campo"><label>Fecha de inicio</label><input type="date" name="FechaInicio" value="${esc(proyecto && proyecto.FechaInicio)}"></div>
        <div class="campo"><label>Fecha de entrega</label><input type="date" name="FechaEntrega" value="${esc(proyecto && proyecto.FechaEntrega)}"></div>
        <div class="campo"><label>URL repositorio</label><input name="UrlRepo" value="${esc(proyecto && proyecto.UrlRepo)}"></div>
        <div class="campo"><label>URL demo</label><input name="UrlDemo" value="${esc(proyecto && proyecto.UrlDemo)}"></div>
        <div class="campo full"><label>Descripción</label><textarea name="Descripcion">${esc(proyecto && proyecto.Descripcion)}</textarea></div>
        <div class="campo full"><label>Alcance</label><textarea name="Alcance" placeholder="Qué incluye el proyecto">${esc(proyecto && proyecto.Alcance)}</textarea></div>
      </div>

      <div class="campo full" style="margin-top:14px">
        <label>Entregables</label>
        <div id="entregables-container">
          ${entregables.map(filaEntregableHtml).join('')}
        </div>
        <button type="button" class="btn btn-secundario btn-chico" id="btn-agregar-entregable">+ Agregar entregable</button>
      </div>

      <div class="campo full" style="margin-top:14px"><label>Notas</label><textarea name="Notas">${esc(proyecto && proyecto.Notas)}</textarea></div>

      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);

  const modal = qs('#modal-contenido');
  qs('#btn-agregar-entregable', modal).addEventListener('click', () => {
    qs('#entregables-container', modal).insertAdjacentHTML('beforeend', filaEntregableHtml());
  });
  modal.addEventListener('click', (e) => {
    if (e.target.matches('.quitar-item')) {
      const filas = qsa('[data-fila-entregable]', modal);
      if (filas.length > 1) {
        e.target.closest('[data-fila-entregable]').remove();
      } else {
        const caja = e.target.closest('[data-fila-entregable]');
        caja.querySelector('.entregable-titulo').value = '';
        caja.querySelector('.entregable-detalle').value = '';
      }
    }
  });

  qs('#form-proyecto').addEventListener('submit', (e) => guardarProyecto(e, editando ? proyecto.Id : null));
}

function leerEntregablesDelFormulario(modal) {
  return qsa('[data-fila-entregable]', modal)
    .map((fila) => ({
      Titulo: qs('.entregable-titulo', fila).value.trim(),
      Descripcion: qs('.entregable-detalle', fila).value.trim(),
      Estado: qs('.entregable-estado', fila).value
    }))
    .filter((e) => e.Titulo);
}

async function guardarProyecto(e, id) {
  e.preventDefault();
  const modal = qs('#modal-contenido');
  const btn = e.submitter || qs('button[type="submit"]', modal);
  const datos = Object.fromEntries(new FormData(e.target).entries());
  datos.Entregables = leerEntregablesDelFormulario(modal);
  btn.disabled = true;
  try {
    if (id) {
      await llamarApi('proyectos.actualizar', { Id: id, cambios: datos });
    } else {
      await llamarApi('proyectos.crear', datos);
    }
    cerrarModal();
    mostrarToast('Proyecto guardado.', 'exito');
    cargarListaProyectos();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function eliminarProyecto(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  try {
    await llamarApi('proyectos.eliminar', { Id: id });
    cerrarModal();
    mostrarToast('Proyecto eliminado.', 'exito');
    cargarListaProyectos();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function descargarPdfProyecto(id, btn) {
  btn.disabled = true;
  try {
    const pdf = await llamarApi('proyectos.generarPdf', { Id: id });
    descargarBase64(pdf.nombreArchivo, pdf.base64, 'application/pdf');
    mostrarToast('PDF generado.', 'exito');
  } catch (e) {
    mostrarToast(e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function obtenerProyectosParaSelect() {
  try {
    return await llamarApi('proyectos.listar');
  } catch (e) {
    return [];
  }
}
