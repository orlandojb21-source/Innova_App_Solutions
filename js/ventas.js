let _cacheVentas = [];
let _cacheVentasClientes = [];

const BADGES_VENTA = { Pagado: 'badge-verde', Pendiente: 'badge-naranja', Parcial: 'badge-azul' };

async function renderVentas(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header">
      <h2>Ventas</h2>
      <button class="btn btn-primario" id="btn-nueva-venta">+ Nueva venta</button>
    </div>
    <div class="filtros">
      <select id="filtro-estado-venta">
        <option value="">Todos los estados</option>
        <option value="Pagado">Pagado</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Parcial">Parcial</option>
      </select>
    </div>
    <div class="tabla-wrap" id="tabla-ventas"><div class="vacio">Cargando…</div></div>
  `;
  qs('#btn-nueva-venta', contenedor).addEventListener('click', () => abrirFormularioVenta());
  qs('#filtro-estado-venta', contenedor).addEventListener('change', (e) => pintarTablaVentas(e.target.value));
  await cargarTablaVentas(contenedor);
}

async function cargarTablaVentas(contenedor) {
  try {
    const [ventas, clientes, config] = await Promise.all([
      llamarApi('ventas.listar'),
      obtenerClientesParaSelect(),
      llamarApi('config.obtener')
    ]);
    _cacheVentas = ventas;
    _cacheVentasClientes = clientes;
    _monedaActual = config.Moneda || '$';
    pintarTablaVentas('', contenedor);
  } catch (e) {
    qs('#tabla-ventas', contenedor || document).innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

function pintarTablaVentas(filtroEstado, contenedor) {
  const destino = qs('#tabla-ventas', contenedor || document);
  const clientePorId = Object.fromEntries(_cacheVentasClientes.map((c) => [c.Id, c]));
  const ventas = filtroEstado ? _cacheVentas.filter((v) => v.Estado === filtroEstado) : _cacheVentas;
  if (!ventas.length) {
    destino.innerHTML = '<div class="vacio">No hay ventas registradas.</div>';
    return;
  }
  destino.innerHTML = `
    <table class="tabla">
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Monto</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        ${ventas.map((v) => {
          const cliente = clientePorId[v.ClienteId];
          return `
            <tr>
              <td>${formatDate(v.Fecha)}</td>
              <td>${cliente ? esc(cliente.Nombre) : '—'}</td>
              <td>${esc(v.Concepto)}</td>
              <td>${formatMoney(v.Monto, _monedaActual)}</td>
              <td>${badgeEstado(v.Estado, BADGES_VENTA)}</td>
              <td class="acciones-fila">
                <button class="btn btn-secundario btn-chico" data-editar-venta="${esc(v.Id)}">Editar</button>
                <button class="btn btn-peligro btn-chico" data-eliminar-venta="${esc(v.Id)}">Eliminar</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  qsa('[data-editar-venta]', destino).forEach((btn) => {
    btn.addEventListener('click', () => {
      const venta = _cacheVentas.find((v) => v.Id === btn.dataset.editarVenta);
      abrirFormularioVenta(venta);
    });
  });
  qsa('[data-eliminar-venta]', destino).forEach((btn) => {
    btn.addEventListener('click', () => eliminarVenta(btn.dataset.eliminarVenta));
  });
}

function abrirFormularioVenta(venta) {
  const editando = !!venta;
  abrirModal(`
    <h3>${editando ? 'Editar venta' : 'Nueva venta'}</h3>
    <form id="form-venta">
      <div class="form-grid">
        <div class="campo full">
          <label>Cliente</label>
          <select name="ClienteId">
            <option value="">— Sin cliente asociado —</option>
            ${_cacheVentasClientes.map((c) => `<option value="${esc(c.Id)}" ${venta && venta.ClienteId === c.Id ? 'selected' : ''}>${esc(c.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full"><label>Concepto *</label><input name="Concepto" required value="${esc(venta && venta.Concepto)}"></div>
        <div class="campo"><label>Monto *</label><input type="number" step="0.01" min="0" name="Monto" required value="${esc(venta ? venta.Monto : '')}"></div>
        <div class="campo"><label>Fecha</label><input type="date" name="Fecha" value="${esc(venta ? (venta.Fecha || '').slice(0, 10) : new Date().toISOString().slice(0, 10))}"></div>
        <div class="campo"><label>Estado</label>
          <select name="Estado">
            ${['Pagado', 'Pendiente', 'Parcial'].map((op) => `<option value="${op}" ${venta && venta.Estado === op ? 'selected' : ''}>${op}</option>`).join('')}
          </select>
        </div>
        <div class="campo"><label>Método de pago</label><input name="MetodoPago" value="${esc(venta && venta.MetodoPago)}"></div>
        <div class="campo full"><label>Notas</label><textarea name="Notas">${esc(venta && venta.Notas)}</textarea></div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);
  qs('#form-venta').addEventListener('submit', (e) => guardarVenta(e, venta && venta.Id));
}

async function guardarVenta(e, id) {
  e.preventDefault();
  const btn = e.submitter || qs('button[type="submit"]', e.target);
  const datos = Object.fromEntries(new FormData(e.target).entries());
  btn.disabled = true;
  try {
    if (id) {
      await llamarApi('ventas.actualizar', { Id: id, cambios: datos });
    } else {
      await llamarApi('ventas.crear', datos);
    }
    cerrarModal();
    mostrarToast('Venta guardada.', 'exito');
    cargarTablaVentas();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function eliminarVenta(id) {
  if (!confirm('¿Eliminar esta venta?')) return;
  try {
    await llamarApi('ventas.eliminar', { Id: id });
    mostrarToast('Venta eliminada.', 'exito');
    cargarTablaVentas();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}
