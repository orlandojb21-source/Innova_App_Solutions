async function renderDashboard(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header"><h2>Resumen</h2></div>
    <div class="grid-resumen" id="grid-resumen"><div class="vacio">Cargando…</div></div>
  `;
  try {
    const config = await obtenerConfigCache();
    const r = await llamarApi('dashboard.resumen');
    const moneda = config.Moneda || '$';
    qs('#grid-resumen', contenedor).innerHTML = `
      <div class="tarjeta-resumen">
        <div class="valor">${r.cotizacionesPendientes}</div>
        <div class="etiqueta">Cotizaciones pendientes</div>
      </div>
      <div class="tarjeta-resumen verde">
        <div class="valor">${formatMoney(r.ventasDelMes, moneda)}</div>
        <div class="etiqueta">Ventas de este mes</div>
      </div>
      <div class="tarjeta-resumen naranja">
        <div class="valor">${formatMoney(r.ventasPendientesMonto, moneda)}</div>
        <div class="etiqueta">Por cobrar</div>
      </div>
      <div class="tarjeta-resumen">
        <div class="valor">${formatMoney(r.gastosDelMes, moneda)}</div>
        <div class="etiqueta">Gastos de este mes</div>
      </div>
      <div class="tarjeta-resumen ${r.gananciaDelMes >= 0 ? 'verde' : 'naranja'}">
        <div class="valor">${formatMoney(r.gananciaDelMes, moneda)}</div>
        <div class="etiqueta">Ganancia de este mes</div>
      </div>
      <div class="tarjeta-resumen cian">
        <div class="valor">${r.proyectosActivos}</div>
        <div class="etiqueta">Proyectos activos</div>
      </div>
      <div class="tarjeta-resumen">
        <div class="valor">${r.totalClientes}</div>
        <div class="etiqueta">Clientes registrados</div>
      </div>
      <div class="tarjeta-resumen ${r.suscripcionesPorVencer > 0 ? 'naranja' : ''}" id="tarjeta-suscripciones-vencer" style="cursor:pointer">
        <div class="valor">${r.suscripcionesPorVencer}</div>
        <div class="etiqueta">Suscripciones por vencer</div>
      </div>
      <div class="tarjeta-resumen ${r.soportePorVencer > 0 ? 'naranja' : ''}" id="tarjeta-soporte-vencer" style="cursor:pointer">
        <div class="valor">${r.soportePorVencer}</div>
        <div class="etiqueta">Soporte por vencer</div>
      </div>
    `;
    qs('#tarjeta-suscripciones-vencer', contenedor).addEventListener('click', async () => {
      await actualizarCampanitaAlertas();
      abrirPanelAlertas();
    });
    qs('#tarjeta-soporte-vencer', contenedor).addEventListener('click', async () => {
      await actualizarCampanitaAlertas();
      abrirPanelAlertas();
    });
  } catch (e) {
    qs('#grid-resumen', contenedor).innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}
