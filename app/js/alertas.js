let _cacheAlertas = [];

async function actualizarCampanitaAlertas() {
  try {
    const [suscripciones, soporte] = await Promise.all([
      llamarApi('suscripciones.alertas'),
      llamarApi('soporte.alertas')
    ]);
    _cacheAlertas = [
      ...suscripciones.map((s) => Object.assign({}, s, { Tipo: 'Suscripción', Etiqueta: s.Producto })),
      ...soporte.map((s) => Object.assign({}, s, { Tipo: 'Soporte', Etiqueta: s.Concepto }))
    ].sort((a, b) => a.diasRestantes - b.diasRestantes);
  } catch (e) {
    return;
  }
  const badge = qs('#badge-alertas');
  const cantidad = _cacheAlertas.length;
  badge.textContent = cantidad;
  badge.classList.toggle('oculto', cantidad === 0);
}

async function abrirPanelAlertas() {
  if (!_cacheAlertas.length) {
    abrirModal(`
      <h3>Por vencer</h3>
      <div class="vacio">No tienes suscripciones ni contratos de soporte vencidos o próximos a vencer.</div>
      <div class="modal-acciones"><button type="button" class="btn btn-secundario" data-cerrar-modal>Cerrar</button></div>
    `);
    return;
  }
  const clientes = await obtenerClientesParaSelect();
  const clientePorId = Object.fromEntries(clientes.map((c) => [c.Id, c]));

  abrirModal(`
    <h3>Por vencer (Suscripciones y Soporte)</h3>
    <div class="tabla-wrap" style="box-shadow:none">
      <table class="tabla">
        <thead><tr><th>Cliente</th><th>Tipo</th><th>Concepto</th><th>Vence</th><th></th></tr></thead>
        <tbody>
          ${_cacheAlertas.map((s) => {
            const cliente = clientePorId[s.ClienteId];
            const texto = s.diasRestantes < 0
              ? `Vencido hace ${Math.abs(s.diasRestantes)} día(s)`
              : (s.diasRestantes === 0 ? 'Vence hoy' : `Vence en ${s.diasRestantes} día(s)`);
            return `
              <tr>
                <td>${cliente ? esc(cliente.Nombre) : '—'}</td>
                <td>${esc(s.Tipo)}</td>
                <td>${esc(s.Etiqueta)}</td>
                <td>${s.diasRestantes < 0 ? '<span class="badge badge-rojo">' + esc(texto) + '</span>' : esc(texto)}</td>
                <td class="acciones-fila">
                  ${cliente && cliente.Telefono ? `<a class="btn btn-secundario btn-chico" href="${esc(enlaceWhatsapp(cliente.Telefono))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                  <button class="btn btn-primario btn-chico" data-pagar-alerta="${esc(s.Id)}" data-tipo-alerta="${esc(s.Tipo)}">Registrar pago</button>
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
    btn.addEventListener('click', () => {
      if (btn.dataset.tipoAlerta === 'Soporte') {
        registrarPagoSoporte(btn.dataset.pagarAlerta);
      } else {
        registrarPagoSuscripcion(btn.dataset.pagarAlerta);
      }
    });
  });
}
