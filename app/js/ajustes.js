async function renderAjustes(contenedor) {
  contenedor.innerHTML = `
    <div class="vista-header"><h2>Ajustes</h2></div>
    <div class="tabla-wrap" style="padding:24px;max-width:640px" id="panel-ajustes">
      <div class="vacio">Cargando…</div>
    </div>
  `;
  const panel = qs('#panel-ajustes', contenedor);
  try {
    const config = await llamarApi('config.obtener');
    _monedaActual = config.Moneda || '$';
    panel.innerHTML = `
      <form id="form-ajustes">
        <div class="form-grid">
          <div class="campo full"><label>Nombre de la empresa</label><input name="NombreEmpresa" value="${esc(config.NombreEmpresa)}"></div>
          <div class="campo"><label>Tu nombre (firmante)</label><input name="NombreFirmante" value="${esc(config.NombreFirmante)}" placeholder="Ej: Orlando Bernal"></div>
          <div class="campo"><label>Cargo</label><input name="Cargo" value="${esc(config.Cargo)}" placeholder="Ej: CEO / Fundador"></div>
          <div class="campo"><label>RUC / Cédula (opcional)</label><input name="RUC" value="${esc(config.RUC)}" placeholder="Déjalo vacío si no aplica"></div>
          <div class="campo"><label>Teléfono</label><input name="Telefono" value="${esc(config.Telefono)}"></div>
          <div class="campo full"><label>Dirección</label><input name="Direccion" value="${esc(config.Direccion)}"></div>
          <div class="campo full"><label>Email de contacto</label><input type="email" name="EmailContacto" value="${esc(config.EmailContacto)}"></div>
          <div class="campo"><label>Símbolo de moneda</label><input name="Moneda" value="${esc(config.Moneda || '$')}"></div>
          <div class="campo"><label>Impuesto por defecto (%)</label><input type="number" min="0" max="100" step="0.01" name="ImpuestoPctDefault" value="${esc(config.ImpuestoPctDefault || 0)}"></div>
          <div class="campo full">
            <label>URL del logo (para el PDF de cotizaciones)</label>
            <input name="LogoUrl" value="${esc(config.LogoUrl)}" placeholder="https://innova-app-solutions-swart.vercel.app/img/icon-192.png">
          </div>
        </div>

        <h3 style="margin:20px 0 10px;font-size:15px;color:var(--titulo)">Formas de pago (se muestran al final de los recibos)</h3>
        <div class="form-grid">
          <div class="campo"><label>Banco</label><input name="BancoNombre" value="${esc(config.BancoNombre)}" placeholder="Ej: Banco General"></div>
          <div class="campo"><label>Tipo de cuenta</label><input name="BancoTipoCuenta" value="${esc(config.BancoTipoCuenta)}" placeholder="Ej: Cuenta de ahorro"></div>
          <div class="campo"><label>Titular de la cuenta</label><input name="BancoTitular" value="${esc(config.BancoTitular)}"></div>
          <div class="campo"><label>Número de cuenta</label><input name="BancoNumeroCuenta" value="${esc(config.BancoNumeroCuenta)}"></div>
          <div class="campo"><label>Yappy</label><input name="YappyNumero" value="${esc(config.YappyNumero)}" placeholder="Número de Yappy"></div>
        </div>
        <div class="modal-acciones" style="justify-content:flex-start">
          <button type="submit" class="btn btn-primario">Guardar ajustes</button>
        </div>
      </form>
    `;
    qs('#form-ajustes', panel).addEventListener('submit', guardarAjustes);
  } catch (e) {
    panel.innerHTML = `<div class="vacio">${esc(e.message)}</div>`;
  }
}

async function guardarAjustes(e) {
  e.preventDefault();
  const btn = e.submitter || qs('button[type="submit"]', e.target);
  const datos = Object.fromEntries(new FormData(e.target).entries());
  btn.disabled = true;
  try {
    await llamarApi('config.guardar', datos);
    invalidarCacheConfig();
    mostrarToast('Ajustes guardados.', 'exito');
    _monedaActual = datos.Moneda || '$';
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}
