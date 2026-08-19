const GOOGLE_CLIENT_ID = '556879084607-j071okvkas6b3tg49ee4mk93b3srrjgb.apps.googleusercontent.com';
const SESSION_KEY = 'ias_panel_session';

let tokenClient = null;

function leerSesion() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getToken() {
  const sesion = leerSesion();
  return sesion ? sesion.token : null;
}

function guardarSesion(token, email) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, email }));
}

function cerrarSesionLocal() {
  localStorage.removeItem(SESSION_KEY);
}

function iniciarGoogleLogin() {
  if (!window.google || !google.accounts) {
    mostrarToast('No se pudo cargar el inicio de sesión de Google. Revisa tu conexión.', 'error');
    return;
  }
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'profile email',
      callback: manejarRespuestaGoogle
    });
  }
  tokenClient.requestAccessToken();
}

async function manejarRespuestaGoogle(respuesta) {
  if (!respuesta || !respuesta.access_token) {
    mostrarToast('No se pudo iniciar sesión con Google.', 'error');
    return;
  }
  mostrarCargandoLogin(true);
  try {
    const resultado = await llamarApi('auth.login', { accessToken: respuesta.access_token });
    guardarSesion(resultado.token, resultado.email);
    mostrarApp();
  } catch (e) {
    mostrarToast(e.message, 'error');
  } finally {
    mostrarCargandoLogin(false);
  }
}

function cerrarSesion() {
  cerrarSesionLocal();
  mostrarLogin();
}

function verificarSesionAlCargar() {
  const sesion = leerSesion();
  if (sesion && sesion.token) {
    mostrarApp();
  } else {
    mostrarLogin();
  }
}
