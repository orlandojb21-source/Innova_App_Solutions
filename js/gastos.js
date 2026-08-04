let _cacheGastos = [];
let _cacheGastosClientes = [];
let _cacheGastosProyectos = [];

const CATEGORIAS_GASTO = ['Herramientas y software', 'Dominios y hosting', 'Costo de cliente (traspasado)', 'Publicidad', 'Otro'];

async function renderGastos(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header">
      <h2>Gastos</h2>
      <button class="btn btn-primario" id="btn-nuevo-gasto">+ Nuevo gasto</button>
    </div>
    <div class="tabla-wrap" id="tabla-gastos"><div class="vacio">Cargando…</div></div>
  `;
  qs('#btn-nuevo-gasto', contenedor).addEventListener('click', () => abrirFormularioGasto());
  await cargarTablaGastos(contenedor);
}

async function cargarTablaGastos(contenedor) {
  const destino = qs('#tabla-gastos', contenedor || document);
  try {
    const [gastos, clientes, proyectos, config] = await Promise.all([
      llamarApi('gastos.listar'),
      obtenerClientesParaSelect(),
      obtenerProyectosParaSelect(),
      llamarApi('config.obtener')
    ]);
    _cacheGastos = gastos;
    _cacheGastosClientes = clientes;
    _cacheGastosProyectos = proyectos;
    _monedaActual = config.Moneda || '$';
    if (!gastos.length) {
      destino.innerHTML = '<div class="vacio">Todavía no tienes gastos registrados.</div>';
      return;
    }
    const clientePorId = Object.fromEntries(clientes.map((c) => [c.Id, c]));
    const total = gastos.reduce((acc, g) => acc + Number(g.Monto || 0), 0);
    destino.innerHTML = `
      <table class="tabla">
        <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Cliente</th><th>Monto</th><th></th></tr></thead>
        <tbody>
          ${gastos.map((g) => {
            const cliente = clientePorId[g.ClienteId];
            return `
              <tr>
                <td>${formatDate(g.Fecha)}</td>
                <td>${esc(g.Concepto)}</td>
                <td>${esc(g.Categoria)}</td>
                <td>${cliente ? esc(cliente.Nombre) : '—'}</td>
                <td>${formatMoney(g.Monto, _monedaActual)}</td>
                <td class="acciones-fila">
                  <button class="btn btn-secundario btn-chico" data-editar-gasto="${esc(g.Id)}">Editar</button>
                  <button class="btn btn-peligro btn-chico" data-eliminar-gasto="${esc(g.Id)}">Eliminar</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div style="padding:14px 16px;text-align:right;font-size:13.5px;color:var(--texto-sub)">
        Total: <strong style="color:var(--titulo)">${formatMoney(total, _monedaActual)}</strong>
      </div>
    `;
    qsa('[data-editar-gasto]', destino).forEach((btn) => {
      btn.addEventListener('click', () => {
        const gasto = _cacheGastos.find((g) => g.Id === btn.dataset.editarGasto);
        abrirFormularioGasto(gasto);
      });
    });
    qsa('[data-eliminar-gasto]', destino).forEach((btn) => {
      btn.addEventListener('click', () => eliminarGasto(btn.dataset.eliminarGasto));
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

async function abrirFormularioGasto(gasto) {
  const clientes = _cacheGastosClientes.length ? _cacheGastosClientes : await obtenerClientesParaSelect();
  const proyectos = _cacheGastosProyectos.length ? _cacheGastosProyectos : await obtenerProyectosParaSelect();
  const editando = !!gasto;
  abrirModal(`
    <h3>${editando ? 'Editar gasto' : 'Nuevo gasto'}</h3>
    <form id="form-gasto">
      <div class="form-grid">
        <div class="campo full"><label>Concepto *</label><input name="Concepto" required value="${esc(gasto && gasto.Concepto)}"></div>
        <div class="campo"><label>Categoría</label>
          <select name="Categoria">
            ${CATEGORIAS_GASTO.map((op) => `<option value="${esc(op)}" ${gasto && gasto.Categoria === op ? 'selected' : ''}>${esc(op)}</option>`).join('')}
          </select>
        </div>
        <div class="campo"><label>Monto *</label><input type="number" step="0.01" min="0.01" name="Monto" required value="${esc(gasto ? gasto.Monto : '')}"></div>
        <div class="campo"><label>Fecha</label><input type="date" name="Fecha" value="${esc(gasto ? (gasto.Fecha || '').slice(0, 10) : new Date().toISOString().slice(0, 10))}"></div>
        <div class="campo full">
          <label>Cliente (opcional, si es un costo traspasado)</label>
          <select name="ClienteId">
            <option value="">— Ninguno —</option>
            ${clientes.map((c) => `<option value="${esc(c.Id)}" ${gasto && gasto.ClienteId === c.Id ? 'selected' : ''}>${esc(c.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full">
          <label>Proyecto (opcional)</label>
          <select name="ProyectoId">
            <option value="">— Ninguno —</option>
            ${proyectos.map((p) => `<option value="${esc(p.Id)}" ${gasto && gasto.ProyectoId === p.Id ? 'selected' : ''}>${esc(p.Nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="campo full"><label>Notas</label><textarea name="Notas">${esc(gasto && gasto.Notas)}</textarea></div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);
  qs('#form-gasto').addEventListener('submit', (e) => guardarGasto(e, editando ? gasto.Id : null));
}

async function guardarGasto(e, id) {
  e.preventDefault();
  const btn = e.submitter || qs('button[type="submit"]', e.target);
  const datos = Object.fromEntries(new FormData(e.target).entries());
  btn.disabled = true;
  try {
    if (id) {
      await llamarApi('gastos.actualizar', { Id: id, cambios: datos });
    } else {
      await llamarApi('gastos.crear', datos);
    }
    cerrarModal();
    mostrarToast('Gasto guardado.', 'exito');
    cargarTablaGastos();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function eliminarGasto(id) {
  if (!confirm('¿Enviar este gasto a la papelera? Podrás recuperarlo después.')) return;
  try {
    await llamarApi('gastos.eliminar', { Id: id });
    mostrarToast('Gasto movido a la papelera.', 'exito');
    cargarTablaGastos();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}
