const API_URL = 'https://script.google.com/macros/s/AKfycbwYbCzj-YGeaKOVXNYDD0T4KPefbRyBIwS1JEH8AMH7Di7ggrYVrvOxMU_iWwY_rT4M/exec';

async function llamarApi(action, payload) {
  const body = {
    action,
    token: getToken() || '',
    payload: payload || {}
  };
  if (action === 'auth.login') body.accessToken = payload.accessToken;

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
  }

  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error('Respuesta inesperada del servidor.');
  }

  if (json.status === 'error') {
    if (action !== 'auth.login' && /sesión inválida|expirada/i.test(json.message || '')) {
      cerrarSesionLocal();
      mostrarLogin();
    }
    throw new Error(json.message || 'Ocurrió un error.');
  }

  return json.data;
}
