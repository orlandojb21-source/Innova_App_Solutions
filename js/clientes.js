let _cacheClientes = [];

async function renderClientes(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header">
      <h2>Clientes</h2>
      <button class="btn btn-primario" id="btn-nuevo-cliente">+ Nuevo cliente</button>
    </div>
    <div class="tabla-wrap" id="tabla-clientes"><div class="vacio">Cargando…</div></div>
  `;
  qs('#btn-nuevo-cliente', contenedor).addEventListener('click', () => abrirFormularioCliente());
  await cargarTablaClientes(contenedor);
}

async function cargarTablaClientes(contenedor) {
  const destino = qs('#tabla-clientes', contenedor || document);
  try {
    _cacheClientes = await llamarApi('clientes.listar');
    if (!_cacheClientes.length) {
      destino.innerHTML = '<div class="vacio">Todavía no tienes clientes registrados.</div>';
      return;
    }
    destino.innerHTML = `
      <table class="tabla">
        <thead><tr><th>Nombre</th><th>Empresa</th><th>Teléfono</th><th>Email</th><th></th></tr></thead>
        <tbody>
          ${_cacheClientes.map((c) => `
            <tr>
              <td>${esc(c.Nombre)}</td>
              <td>${esc(c.Empresa) || '—'}</td>
              <td>${enlaceTelefonoHtml(c.Telefono)}</td>
              <td>${esc(c.Email) || '—'}</td>
              <td class="acciones-fila">
                <button class="btn btn-secundario btn-chico" data-editar-cliente="${esc(c.Id)}">Editar</button>
                <button class="btn btn-peligro btn-chico" data-eliminar-cliente="${esc(c.Id)}">Eliminar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    qsa('[data-editar-cliente]', destino).forEach((btn) => {
      btn.addEventListener('click', () => {
        const cliente = _cacheClientes.find((c) => c.Id === btn.dataset.editarCliente);
        abrirFormularioCliente(cliente);
      });
    });
    qsa('[data-eliminar-cliente]', destino).forEach((btn) => {
      btn.addEventListener('click', () => eliminarCliente(btn.dataset.eliminarCliente));
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

function abrirFormularioCliente(cliente) {
  const editando = !!cliente;
  abrirModal(`
    <h3>${editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
    <form id="form-cliente">
      <div class="form-grid">
        <div class="campo full"><label>Nombre *</label><input name="Nombre" required value="${esc(cliente && cliente.Nombre)}"></div>
        <div class="campo"><label>Empresa</label><input name="Empresa" value="${esc(cliente && cliente.Empresa)}"></div>
        <div class="campo"><label>Teléfono</label><input name="Telefono" placeholder="Incluye código de país, ej: +507 6123-4567" value="${esc(cliente && cliente.Telefono)}"></div>
        <div class="campo full"><label>Email</label><input type="email" name="Email" value="${esc(cliente && cliente.Email)}"></div>
        <div class="campo full"><label>Dirección</label><input name="Direccion" value="${esc(cliente && cliente.Direccion)}"></div>
        <div class="campo full"><label>Notas</label><textarea name="Notas">${esc(cliente && cliente.Notas)}</textarea></div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);
  qs('#form-cliente').addEventListener('submit', (e) => guardarCliente(e, cliente && cliente.Id));
}

async function guardarCliente(e, id) {
  e.preventDefault();
  const btn = e.submitter || qs('button[type="submit"]', e.target);
  const datos = Object.fromEntries(new FormData(e.target).entries());
  btn.disabled = true;
  try {
    if (id) {
      await llamarApi('clientes.actualizar', { Id: id, cambios: datos });
    } else {
      await llamarApi('clientes.crear', datos);
    }
    cerrarModal();
    mostrarToast('Cliente guardado.', 'exito');
    cargarTablaClientes();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function eliminarCliente(id) {
  if (!confirm('¿Enviar este cliente a la papelera? Podrás recuperarlo después.')) return;
  try {
    await llamarApi('clientes.eliminar', { Id: id });
    mostrarToast('Cliente movido a la papelera.', 'exito');
    cargarTablaClientes();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function obtenerClientesParaSelect() {
  try {
    return await llamarApi('clientes.listar');
  } catch (e) {
    return [];
  }
}
