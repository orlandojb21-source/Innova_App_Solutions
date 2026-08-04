const NOMBRES_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function etiquetaMes(claveYyyyMm) {
  const [anio, mes] = claveYyyyMm.split('-').map(Number);
  return `${NOMBRES_MES[mes - 1]} ${anio}`;
}

async function renderReportes(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header"><h2>Reportes</h2></div>
    <div id="contenido-reportes"><div class="vacio">Cargando…</div></div>
  `;
  const destino = qs('#contenido-reportes', contenedor);
  try {
    const [config, r] = await Promise.all([
      llamarApi('config.obtener'),
      llamarApi('reportes.resumen')
    ]);
    _monedaActual = config.Moneda || '$';

    destino.innerHTML = `
      <div class="vista-header"><h2 style="font-size:16px">Últimos meses</h2></div>
      <div class="tabla-wrap" style="margin-bottom:24px">
        ${r.porMes.length ? `
          <table class="tabla">
            <thead><tr><th>Mes</th><th>Ventas</th><th>Gastos</th><th>Ganancia</th></tr></thead>
            <tbody>
              ${r.porMes.map((m) => `
                <tr>
                  <td>${esc(etiquetaMes(m.mes))}</td>
                  <td>${formatMoney(m.ventas, _monedaActual)}</td>
                  <td>${formatMoney(m.gastos, _monedaActual)}</td>
                  <td style="font-weight:600;color:${m.ganancia >= 0 ? 'var(--green)' : 'var(--rojo)'}">${formatMoney(m.ganancia, _monedaActual)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="vacio">Todavía no hay suficientes datos para mostrar un histórico.</div>'}
      </div>

      <div class="vista-header"><h2 style="font-size:16px">Clientes con más ingresos</h2></div>
      <div class="tabla-wrap">
        ${r.topClientes.length ? `
          <table class="tabla">
            <thead><tr><th>Cliente</th><th>Total facturado</th></tr></thead>
            <tbody>
              ${r.topClientes.map((c) => `
                <tr>
                  <td>${esc(c.Nombre)}</td>
                  <td>${formatMoney(c.Total, _monedaActual)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="vacio">Todavía no hay ventas registradas.</div>'}
      </div>
    `;
  } catch (e) {
    destino.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}
