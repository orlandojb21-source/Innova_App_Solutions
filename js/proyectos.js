let _cacheProyectos = [];

const BADGES_PROYECTO = { EnProgreso: 'badge-azul', Completado: 'badge-verde', Pausado: 'badge-gris' };

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
    const [proyectos, clientes] = await Promise.all([llamarApi('proyectos.listar'), obtenerClientesParaSelect()]);
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
              ${p.Descripcion ? `<p class="desc">${esc(p.Descripcion)}</p>` : ''}
              ${p.Stack ? `<div class="stack">${esc(p.Stack)}</div>` : ''}
              <div class="enlaces">
                ${p.UrlRepo ? `<a href="${esc(p.UrlRepo)}" target="_blank" rel="noopener">Repositorio</a>` : ''}
                ${p.UrlDemo ? `<a href="${esc(p.UrlDemo)}" target="_blank" rel="noopener">Demo</a>` : ''}
              </div>
              <div class="acciones-fila" style="margin-top:12px">
                <button class="btn btn-secundario btn-chico" data-editar-proyecto="${esc(p.Id)}">Editar</button>
                <button class="btn btn-peligro btn-chico" data-eliminar-proyecto="${esc(p.Id)}">Eliminar</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    qsa('[data-editar-proyecto]', destino).forEach((btn) => {
      btn.addEventListener('click', () => {
        const proyecto = _cacheProyectos.find((p) => p.Id === btn.dataset.editarProyecto);
        abrirFormularioProyecto(proyecto, clientes);
      });
    });
    qsa('[data-eliminar-proyecto]', destino).forEach((btn) => {
      btn.addEventListener('click', () => eliminarProyecto(btn.dataset.eliminarProyecto));
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

async function abrirFormularioProyecto(proyecto, clientesPrecargados) {
  const clientes = clientesPrecargados || await obtenerClientesParaSelect();
  const editando = !!proyecto;
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
        <div class="campo full"><label>Notas</label><textarea name="Notas">${esc(proyecto && proyecto.Notas)}</textarea></div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn btn-secundario" data-cerrar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">Guardar</button>
      </div>
    </form>
  `);
  qs('#form-proyecto').addEventListener('submit', (e) => guardarProyecto(e, proyecto && proyecto.Id));
}

async function guardarProyecto(e, id) {
  e.preventDefault();
  const btn = e.submitter || qs('button[type="submit"]', e.target);
  const datos = Object.fromEntries(new FormData(e.target).entries());
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
    mostrarToast('Proyecto eliminado.', 'exito');
    cargarListaProyectos();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}
