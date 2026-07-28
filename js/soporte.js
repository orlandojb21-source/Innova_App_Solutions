let _cacheSoporte = [];
let _cacheSoporteClientes = [];
let _cacheSoporteProyectos = [];

const BADGES_SOPORTE = { Activo: 'badge-verde', Cancelado: 'badge-gris' };

async function renderSoporte(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header">
      <h2>Soporte</h2>
      <button class="btn btn-primario" id="btn-nuevo-soporte">+ Nuevo contrato de soporte</button>
    </div>
    <div class="tabla-wrap" id="tabla-soporte"><div class="vacio">Cargando…</div></div>
  `;
  qs('#btn-nuevo-soporte', contenedor).addEventListener('click', () => abrirFormularioSoporte());
  await cargarTablaSoporte(contenedor);
}

async function cargarTablaSoporte(contenedor) {
  const destino = qs('#tabla-soporte', contenedor || document);
  try {
    const [contratos, clientes, proyectos, config] = await Promise.all([
      llamarApi('soporte.listar'),
      obtenerClientesParaSelect(),
      obtenerProyectosParaSelect(),
      llamarApi('config.obtener')
    ]);
    _cacheSoporte = contratos;
    _cacheSoporteClientes = clientes;
    _cacheSoporteProyectos = proyectos;
    _monedaActual = config.Moneda || '$';
    if (!contratos.length) {
      destino.innerHTML = '<div class="vacio">Todavía no tienes contratos de soporte registrados.</div>';
      return;
    }
    const clientePorId = Object.fromEntries(clientes.map((c) => [c.Id, c]));
    const proyectoPorId = Object.fromEntries(proyectos.map((p) => [p.Id, p]));
    destino.innerHTML = `
      <table class="tabla">
        <thead><tr><th>Cliente</th><th>Concepto</th><th>Proyecto</th><th>Monto</th><th>Frecuencia</th><th>Próx. vencimiento</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${contratos.map((s) => {
            const cliente = clientePorId[s.ClienteId];
            const proyecto = proyectoPorId[s.ProyectoId];
            const dias = diasHastaFecha(s.ProximoVencimiento);
            const vencido = s.Estado === 'Activo' && dias < 0;
            return `
              <tr>
                <td>${cliente ? esc(cliente.Nombre) : '—'}</td>
                <td>${esc(s.Concepto)}</td>
                <td>${proyecto ? esc(proyecto.Nombre) : '—'}</td>
                <td>${formatMoney(s.Monto, _monedaActual)}</td>
                <td>${esc(s.Frecuencia)}</td>
                <td>${formatDate(s.ProximoVencimiento)} ${vencido ? '<span class="badge badge-rojo">Vencido</span>' : ''}</td>
                <td>${badgeEstado(s.Estado, BADGES_SOPORTE)}</td>
                <td class="acciones-fila">
                  ${s.Estado === 'Activo' ? `<button class="btn btn-primario btn-chico" data-registrar-pago-soporte="${esc(s.Id)}">Registrar pago</button>` : ''}
                  <button class="btn btn-secundario btn-chico" data-editar-soporte="${esc(s.Id)}">Editar</button>
                  <button class="btn btn-peligro btn-chico" data-eliminar-soporte="${esc(s.Id)}">Eliminar</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    qsa('[data-registrar-pago-soporte]', destino).forEach((btn) => {
      btn.addEventListener('click', () => registrarPagoSoporte(btn.dataset.registrarPagoSoporte));
    });
    qsa('[data-editar-soporte]', destino).forEach((btn) => {
      btn.addEventListener('click', () => {
        const contrato = _cacheSoporte.find((s) => s.Id === btn.dataset.editarSoporte);
        abrirFormularioSoporte(contrato);
      });
    });
    qsa('[data-eliminar-soporte]', destino).forEach((btn) => {
      btn.addEventListener('click', () => eliminarSoporte(btn.dataset.eliminarSoporte));
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

async function abrirFormularioSoporte(contrato) {
  const clientes = _cacheSoporteClientes.length ? _cacheSoporteClientes : await obtenerClientesParaSelect();
  const proyectos = _cacheSoporteProyectos.length ? _cacheSoporteProyectos : await obtenerProyectosParaSelect();
  const editando = !!contrato;
  abrirModal(`
    <h3>${editando ? 'Editar contrato de soporte' : 'Nuevo contrato de soporte'}</h3>
    <form id="form-soporte">
      <div class="form-grid">
        <div class="campo full">
          <label>Cliente *</label>
          <select name="ClienteId" required>
            <option value="">Selecciona un cliente…</option>
            ${clientes.map((c) => `<option value="${esc(c.Id)}" ${editando && contrato.ClienteId === c.Id ? 'selected' : ''}>${esc(c.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full">
          <label>Proyecto (opcional)</label>
          <select name="ProyectoId" id="select-proyecto-soporte">
            <option value="">— Ninguno / no aplica —</option>
            ${proyectos.map((p) => `<option value="${esc(p.Id)}" ${editando && contrato.ProyectoId === p.Id ? 'selected' : ''}>${esc(p.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full"><label>Concepto *</label><input name="Concepto" id="input-concepto-soporte" required placeholder="Ej: Soporte mensual App Agro Sky" value="${esc(contrato && contrato.Concepto)}"></div>
        <div class="campo full"><label>Alcance del soporte</label><textarea name="Alcance" placeholder="Ej: corrección de bugs, actualizaciones menores, hasta 5 horas al mes">${esc(contrato && contrato.Alcance)}</textarea></div>
        <div class="campo"><label>Monto *</label><input type="number" step="0.01" min="0" name="Monto" required value="${esc(editando ? contrato.Monto : '')}"></div>
        <div class="campo"><label>Frecuencia *</label>
          <select name="Frecuencia" required>
            ${['Mensual', 'Anual'].map((op) => `<option value="${op}" ${editando && contrato.Frecuencia === op ? 'selected' : ''}>${op}</option>`).join('')}
          </select>
        </div>
        <div class="campo"><label>Fecha de inicio</label><input type="date" name="FechaInicio" value="${esc(editando ? (contrato.FechaInicio || '').slice(0, 10) : new Date().toISOString().slice(0, 10))}"></div>
        <div class="campo"><label>Próximo vencimiento</label><input type="date" name="ProximoVencimiento" value="${esc(editando ? (contrato.ProximoVencimiento || '').slice(0, 10) : '')}" placeholder="Se calcula solo si lo dejas vacío"></div>
        <div class="campo full"><label>Notas</label><textarea name="Notas">${esc(contrato && contrato.Notas)}</textarea></div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);

  qs('#select-proyecto-soporte').addEventListener('change', (e) => {
    const campoConcepto = qs('#input-concepto-soporte');
    if (campoConcepto.value.trim()) return;
    const proyecto = proyectos.find((p) => p.Id === e.target.value);
    if (proyecto) campoConcepto.value = 'Soporte ' + proyecto.Nombre;
  });

  qs('#form-soporte').addEventListener('submit', (e) => guardarSoporte(e, editando ? contrato.Id : null));
}

async function guardarSoporte(e, id) {
  e.preventDefault();
  const btn = e.submitter || qs('button[type="submit"]', e.target);
  const datos = Object.fromEntries(new FormData(e.target).entries());
  if (!datos.ProximoVencimiento) delete datos.ProximoVencimiento;
  btn.disabled = true;
  try {
    if (id) {
      await llamarApi('soporte.actualizar', { Id: id, cambios: datos });
    } else {
      await llamarApi('soporte.crear', datos);
    }
    cerrarModal();
    mostrarToast('Contrato de soporte guardado.', 'exito');
    cargarTablaSoporte();
    actualizarCampanitaAlertas();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function registrarPagoSoporte(id) {
  if (!confirm('¿Registrar el pago de este contrato de soporte? Se creará una venta y se actualizará el próximo vencimiento.')) return;
  try {
    await llamarApi('soporte.registrarPago', { Id: id });
    mostrarToast('Pago registrado. Se generó la venta y se actualizó el vencimiento.', 'exito');
    cargarTablaSoporte();
    actualizarCampanitaAlertas();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}

async function eliminarSoporte(id) {
  if (!confirm('¿Eliminar este contrato de soporte?')) return;
  try {
    await llamarApi('soporte.eliminar', { Id: id });
    mostrarToast('Contrato de soporte eliminado.', 'exito');
    cargarTablaSoporte();
    actualizarCampanitaAlertas();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}
