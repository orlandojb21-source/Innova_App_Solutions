let _cacheAlertasSuscripciones = [];

async function actualizarCampanitaAlertas() {
  try {
    _cacheAlertasSuscripciones = await llamarApi('suscripciones.alertas');
  } catch (e) {
    return;
  }
  const badge = qs('#badge-alertas');
  const cantidad = _cacheAlertasSuscripciones.length;
  badge.textContent = cantidad;
  badge.classList.toggle('oculto', cantidad === 0);
}

async function abrirPanelAlertas() {
  if (!_cacheAlertasSuscripciones.length) {
    abrirModal(`
      <h3>Suscripciones por vencer</h3>
      <div class="vacio">No tienes suscripciones vencidas ni próximas a vencer.</div>
      <div class="modal-acciones"><button type="button" class="btn btn-secundario" data-cerrar-modal>Cerrar</button></div>
    `);
    return;
  }
  const clientes = await obtenerClientesParaSelect();
  const clientePorId = Object.fromEntries(clientes.map((c) => [c.Id, c]));

  abrirModal(`
    <h3>Suscripciones por vencer</h3>
    <div class="tabla-wrap" style="box-shadow:none">
      <table class="tabla">
        <thead><tr><th>Cliente</th><th>Producto</th><th>Vence</th><th></th></tr></thead>
        <tbody>
          ${_cacheAlertasSuscripciones.map((s) => {
            const cliente = clientePorId[s.ClienteId];
            const texto = s.diasRestantes < 0
              ? `Vencida hace ${Math.abs(s.diasRestantes)} día(s)`
              : (s.diasRestantes === 0 ? 'Vence hoy' : `Vence en ${s.diasRestantes} día(s)`);
            return `
              <tr>
                <td>${cliente ? esc(cliente.Nombre) : '—'}</td>
                <td>${esc(s.Producto)}</td>
                <td>${s.diasRestantes < 0 ? '<span class="badge badge-rojo">' + esc(texto) + '</span>' : esc(texto)}</td>
                <td class="acciones-fila">
                  ${cliente && cliente.Telefono ? `<a class="btn btn-secundario btn-chico" href="${esc(enlaceWhatsapp(cliente.Telefono))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                  <button class="btn btn-primario btn-chico" data-pagar-alerta="${esc(s.Id)}">Registrar pago</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="modal-acciones"><button type="button" class="btn btn-secundario" data-cerrar-modal>Cerrar</button></div>
  `);

  qsa('[data-pagar-alerta]').forEach((btn) => {
    btn.addEventListener('click', () => registrarPagoSuscripcion(btn.dataset.pagarAlerta));
  });
}
