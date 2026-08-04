async function renderPapelera(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header"><h2>Papelera</h2></div>
    <p style="color:var(--texto-sub);font-size:13.5px;margin-top:-10px">Los registros eliminados quedan aquí — puedes recuperarlos o borrarlos para siempre.</p>
    <div class="tabla-wrap" id="tabla-papelera"><div class="vacio">Cargando…</div></div>
  `;
  await cargarTablaPapelera(contenedor);
}

async function cargarTablaPapelera(contenedor) {
  const destino = qs('#tabla-papelera', contenedor || document);
  try {
    const registros = await llamarApi('papelera.listar');
    if (!registros.length) {
      destino.innerHTML = '<div class="vacio">La papelera está vacía.</div>';
      return;
    }
    destino.innerHTML = `
      <table class="tabla">
        <thead><tr><th>Tipo</th><th>Nombre / concepto</th><th>Eliminado el</th><th></th></tr></thead>
        <tbody>
          ${registros.map((r) => `
            <tr>
              <td>${esc(r.Tipo)}</td>
              <td>${esc(r.Etiqueta)}</td>
              <td>${formatDate(r.FechaEliminado)}</td>
              <td class="acciones-fila">
                <button class="btn btn-primario btn-chico" data-restaurar="${esc(r.Sheet)}|${esc(r.Id)}">Restaurar</button>
                <button class="btn btn-peligro btn-chico" data-eliminar-definitivo="${esc(r.Sheet)}|${esc(r.Id)}">Eliminar para siempre</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    qsa('[data-restaurar]', destino).forEach((btn) => {
      btn.addEventListener('click', () => {
        const [sheet, id] = btn.dataset.restaurar.split('|');
        restaurarDePapelera(sheet, id);
      });
    });
    qsa('[data-eliminar-definitivo]', destino).forEach((btn) => {
      btn.addEventListener('click', () => {
        const [sheet, id] = btn.dataset.eliminarDefinitivo.split('|');
        eliminarDefinitivamente(sheet, id);
      });
    });
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

async function restaurarDePapelera(sheet, id) {
  try {
    await llamarApi('papelera.restaurar', { Sheet: sheet, Id: id });
    mostrarToast('Registro restaurado.', 'exito');
    cargarTablaPapelera();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}

async function eliminarDefinitivamente(sheet, id) {
  if (!confirm('Esto borra el registro para siempre y no se puede deshacer. ¿Continuar?')) return;
  try {
    await llamarApi('papelera.eliminarDefinitivo', { Sheet: sheet, Id: id });
    mostrarToast('Registro eliminado para siempre.', 'exito');
    cargarTablaPapelera();
  } catch (e) {
    mostrarToast(e.message, 'error');
  }
}
