let _cacheSuscripciones = [];
let _cacheSuscripcionesClientes = [];
let _cacheSuscripcionesProyectos = [];

const BADGES_SUSCRIPCION = { Activa: 'badge-verde', Cancelada: 'badge-gris' };

async function renderSuscripciones(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header">
      <h2>Suscripciones</h2>
      <button class="btn btn-primario" id="btn-nueva-suscripcion">+ Nueva suscripción</button>
    </div>
    <div class="tabla-wrap" id="tabla-suscripciones"><div class="vacio">Cargando…</div></div>
  `;
  qs('#btn-nueva-suscripcion', contenedor).addEventListener('click', () => abrirFormularioSuscripcion());
  await cargarTablaSuscripciones(contenedor);
}

async function cargarTablaSuscripciones(contenedor) {
  const destino = qs('#tabla-suscripciones', contenedor || document);
  try {
    const [suscripciones, clientes, proyectos, config] = await Promise.all([
      llamarApi('suscripciones.listar'),
      obtenerClientesParaSelect(),
      obtenerProyectosParaSelect(),
      obtenerConfigCache()
    ]);
    _cacheSuscripciones = suscripciones;
    _cacheSuscripcionesClientes = clientes;
    _cacheSuscripcionesProyectos = proyectos;
    _monedaActual = config.Moneda || '$';
    if (!suscripciones.length) {
      destino.innerHTML = '<div class="vacio">Todavía no tienes suscripciones registradas.</div>';
      return;
    }
    const clientePorId = Object.fromEntries(clientes.map((c) => [c.Id, c]));
    const proyectoPorId = Object.fromEntries(proyectos.map((p) => [p.Id, p]));
    destino.innerHTML = `
      <table class="tabla">
        <thead><tr><th>Cliente</th><th>Producto</th><th>Proyecto</th><th>Monto</th><th>Frecuencia</th><th>Próx. vencimiento</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${suscripciones.map((s) => {
            const cliente = clientePorId[s.ClienteId];
            const proyecto = proyectoPorId[s.ProyectoId];
            const dias = diasHastaFecha(s.ProximoVencimiento);
            const vencida = s.Estado === 'Activa' && dias < 0;
            return `
              <tr>
                <td>${cliente ? esc(cliente.Nombre) : '—'}</td>
                <td>${esc(s.Producto)}</td>
                <td>${proyecto ? esc(proyecto.Nombre) : '—'}</td>
                <td>${formatMoney(s.Monto, _monedaActual)}</td>
                <td>${esc(s.Frecuencia)}</td>
                <td>${formatDate(s.ProximoVencimiento)} ${vencida ? '<span class="badge badge-rojo">Vencida</span>' : ''}</td>
                <td>${badgeEstado(s.Estado, BADGES_SUSCRIPCION)}</td>
                <td class="acciones-fila">
                  ${s.Estado === 'Activa' ? `<button class="btn btn-primario btn-chico" data-registrar-pago="${esc(s.Id)}">Registrar pago</button>` : ''}
                  <button class="btn btn-secundario btn-chico" data-editar-suscripcion="${esc(s.Id)}">Editar</button>
                  <button class="btn btn-peligro btn-chico" data-eliminar-suscripcion="${esc(s.Id)}">Eliminar</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    qsa('[data-registrar-pago]', destino).forEach((btn) => {
      btn.addEventListener('click', () => registrarPagoSuscripcion(btn.dataset.registrarPago));
    });
    qsa('[data-editar-suscripcion]', destino).forEach((btn) => {
      btn.addEventListener('click', () => {
        const suscripcion = _cacheSuscripciones.find((s) => s.Id === btn.dataset.editarSuscripcion);
        abrirFormularioSuscripcion(suscripcion);
      });
    });
    qsa('[data-eliminar-suscripcion]', destino).forEach((btn) => {
      btn.addEventListener('click', () => eliminarSuscripcion(btn.dataset.eliminarSuscripcion));
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

async function abrirFormularioSuscripcion(suscripcion) {
  const clientes = _cacheSuscripcionesClientes.length ? _cacheSuscripcionesClientes : await obtenerClientesParaSelect();
  const proyectos = _cacheSuscripcionesProyectos.length ? _cacheSuscripcionesProyectos : await obtenerProyectosParaSelect();
  const editando = !!suscripcion;
  abrirModal(`
    <h3>${editando ? 'Editar suscripción' : 'Nueva suscripción'}</h3>
    <form id="form-suscripcion">
      <div class="form-grid">
        <div class="campo full">
          <label>Cliente *</label>
          <select name="ClienteId" required>
            <option value="">Selecciona un cliente…</option>
            ${clientes.map((c) => `<option value="${esc(c.Id)}" ${editando && suscripcion.ClienteId === c.Id ? 'selected' : ''}>${esc(c.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full">
          <label>Proyecto (opcional)</label>
          <select name="ProyectoId" id="select-proyecto-suscripcion">
            <option value="">— Ninguno / no aplica —</option>
            ${proyectos.map((p) => `<option value="${esc(p.Id)}" ${editando && suscripcion.ProyectoId === p.Id ? 'selected' : ''}>${esc(p.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full"><label>Producto / servicio *</label><input name="Producto" id="input-producto-suscripcion" required placeholder="Ej: Licencia IAS Tienda" value="${esc(suscripcion && suscripcion.Producto)}"></div>
        <div class="campo"><label>Monto *</label><input type="number" step="0.01" min="0" name="Monto" required value="${esc(editando ? suscripcion.Monto : '')}"></div>
        <div class="campo"><label>Frecuencia *</label>
          <select name="Frecuencia" required>
            ${['Mensual', 'Anual'].map((op) => `<option value="${op}" ${editando && suscripcion.Frecuencia === op ? 'selected' : ''}>${op}</option>`).join('')}
          </select>
        </div>
        <div class="campo"><label>Fecha de inicio</label><input type="date" name="FechaInicio" value="${esc(editando ? (suscripcion.FechaInicio || '').slice(0, 10) : new Date().toISOString().slice(0, 10))}"></div>
        <div class="campo"><label>Próximo vencimiento</label><input type="date" name="ProximoVencimiento" value="${esc(editando ? (suscripcion.ProximoVencimiento || '').slice(0, 10) : '')}" placeholder="Se calcula solo si lo dejas vacío"></div>
        <div class="campo full"><label>Notas</label><textarea name="Notas">${esc(suscripcion && suscripcion.Notas)}</textarea></div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);

  qs('#select-proyecto-suscripcion').addEventListener('change', (e) => {
    const campoProducto = qs('#input-producto-suscripcion');
    if (campoProducto.value.trim()) return;
    const proyecto = proyectos.find((p) => p.Id === e.target.value);
    if (proyecto) campoProducto.value = 'Licencia ' + proyecto.Nombre;
  });

  qs('#form-suscripcion').addEventListener('submit', (e) => guardarSuscripcion(e, editando ? suscripcion.Id : null));
}

async function guardarSuscripcion(e, id) {
  e.preventDefault();
  const btn = e.submitter || qs('button[type="submit"]', e.target);
  const datos = Object.fromEntries(new FormData(e.target).entries());
  if (!datos.ProximoVencimiento) delete datos.ProximoVencimiento;
  btn.disabled = true;
  try {
    if (id) {
      await llamarApi('suscripciones.actualizar', { Id: id, cambios: datos });
    } else {
      await llamarApi('suscripciones.crear', datos);
    }
    cerrarModal();
    mostrarToast('Suscripción guardada.', 'exito');
    cargarTablaSuscripciones();
    actualizarCampanitaAlertas();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function registrarPagoSuscripcion(id) {
  if (!confirm('¿Registrar el pago de esta suscripción? Se creará una venta y se actualizará el próximo vencimiento.')) return;
  try {
    await llamarApi('suscripciones.registrarPago', { Id: id });
    mostrarToast('Pago registrado. Se generó la venta y se actualizó el vencimiento.', 'exito');
    cargarTablaSuscripciones();
    actualizarCampanitaAlertas();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}

async function eliminarSuscripcion(id) {
  if (!confirm('¿Enviar esta suscripción a la papelera? Podrás recuperarla después.')) return;
  try {
    await llamarApi('suscripciones.eliminar', { Id: id });
    mostrarToast('Suscripción movida a la papelera.', 'exito');
    cargarTablaSuscripciones();
    actualizarCampanitaAlertas();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}
