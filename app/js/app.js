const VISTAS = {
  dashboard: renderDashboard,
  clientes: renderClientes,
  cotizaciones: renderCotizaciones,
  ventas: renderVentas,
  gastos: renderGastos,
  suscripciones: renderSuscripciones,
  soporte: renderSoporte,
  proyectos: renderProyectos,
  reportes: renderReportes,
  papelera: renderPapelera,
  ajustes: renderAjustes
};

function mostrarLogin() {
  qs('#app-shell').classList.add('oculto');
  qs('#pantalla-login').classList.remove('oculto');
}

function mostrarApp() {
  qs('#pantalla-login').classList.add('oculto');
  qs('#app-shell').classList.remove('oculto');
  navegarA('dashboard');
  actualizarCampanitaAlertas();
}

function mostrarCargandoLogin(mostrando) {
  const btn = qs('#btn-google-login');
  const spinner = qs('#login-spinner');
  btn.disabled = mostrando;
  spinner.classList.toggle('oculto', !mostrando);
}

function navegarA(vista) {
  qsa('.vista').forEach((el) => el.classList.add('oculto'));
  qsa('.nav-btn').forEach((btn) => btn.classList.toggle('activo', btn.dataset.vista === vista));
  const contenedor = qs('#vista-' + vista);
  contenedor.classList.remove('oculto');
  const render = VISTAS[vista];
  if (render) render(contenedor);
}

document.addEventListener('DOMContentLoaded', () => {
  qs('#btn-google-login').addEventListener('click', iniciarGoogleLogin);
  qs('#btn-salir').addEventListener('click', cerrarSesion);
  qs('#btn-campanita').addEventListener('click', abrirPanelAlertas);
  qsa('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => navegarA(btn.dataset.vista));
  });
  verificarSesionAlCargar();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
