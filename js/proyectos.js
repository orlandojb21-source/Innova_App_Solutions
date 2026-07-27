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
                <button class="btn btn-secundario btn-chico" data-descargar-proyecto="${esc(p.Id)}">Descargar PDF</button>
                <button class="btn btn-secundario btn-chico" data-editar-proyecto="${esc(p.Id)}">Editar</button>
                <button class="btn btn-peligro btn-chico" data-eliminar-proyecto="${esc(p.Id)}">Eliminar</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    qsa('[data-editar-proyecto]', destino).forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const proyecto = await llamarApi('proyectos.obtener', { Id: btn.dataset.editarProyecto });
          abrirFormularioProyecto(proyecto, clientes);
        } catch (e) {
          mostrarToast(e.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
    qsa('[data-eliminar-proyecto]', destino).forEach((btn) => {
      btn.addEventListener('click', () => eliminarProyecto(btn.dataset.eliminarProyecto));
    });
    qsa('[data-descargar-proyecto]', destino).forEach((btn) => {
      btn.addEventListener('click', () => descargarPdfProyecto(btn.dataset.descargarProyecto, btn));
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

function filaEntregableHtml(entregable) {
  const e = entregable || { Descripcion: '', Estado: 'Pendiente' };
  return `
    <div class="fila-entregable" data-fila-entregable>
      <input type="text" class="entregable-desc" placeholder="Descripción del entregable" value="${esc(e.Descripcion)}">
      <select class="entregable-estado">
        <option value="Pendiente" ${e.Estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="Entregado" ${e.Estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
      </select>
      <button type="button" class="quitar-item" title="Quitar entregable">×</button>
    </div>
  `;
}

async function abrirFormularioProyecto(proyecto, clientesPrecargados) {
  const clientes = clientesPrecargados || await obtenerClientesParaSelect();
  const editando = !!proyecto;
  const entregables = (editando && proyecto.Entregables && proyecto.Entregables.length) ? proyecto.Entregables : [{ Descripcion: '', Estado: 'Pendiente' }];

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
        <div class="campo full"><label>Alcance</label><textarea name="Alcance" placeholder="Qué incluye el proyecto">${esc(proyecto && proyecto.Alcance)}</textarea></div>
      </div>

      <div class="campo full" style="margin-top:14px">
        <label>Entregables</label>
        <div class="items-cotizacion" id="entregables-container">
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
        e.target.closest('[data-fila-entregable]').querySelector('.entregable-desc').value = '';
      }
    }
  });

  qs('#form-proyecto').addEventListener('submit', (e) => guardarProyecto(e, editando ? proyecto.Id : null));
}

function leerEntregablesDelFormulario(modal) {
  return qsa('[data-fila-entregable]', modal)
    .map((fila) => ({
      Descripcion: qs('.entregable-desc', fila).value.trim(),
      Estado: qs('.entregable-estado', fila).value
    }))
    .filter((e) => e.Descripcion);
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
