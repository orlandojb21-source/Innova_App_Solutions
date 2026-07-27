/**
 * Autenticación de un solo usuario (Orlando): el frontend obtiene un
 * access_token de Google (Identity Services), este backend lo valida
 * directamente contra Google (nunca confía en el email que mande el
 * cliente) y, si coincide con ADMIN_EMAIL, emite un token de sesión propio
 * firmado (HMAC-SHA256) que el frontend reutiliza en cada llamada.
 */

var SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function verifyGoogleEmail_(accessToken) {
  if (!accessToken) return null;
  var res = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  var info = JSON.parse(res.getContentText());
  if (!info.email || (info.email_verified !== true && info.email_verified !== 'true')) return null;
  return info.email;
}

function safeEquals_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var resultado = 0;
  for (var i = 0; i < a.length; i++) resultado |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return resultado === 0;
}

function firmar_(payloadStr) {
  var secreto = getScriptProp_('SESSION_SECRET');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payloadStr, secreto));
}

function createSessionToken(email) {
  var payload = { email: email, exp: Date.now() + SESSION_TTL_MS };
  var payloadStr = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  return payloadStr + '.' + firmar_(payloadStr);
}

function verifySessionToken(token) {
  if (!token || token.indexOf('.') === -1) return null;
  var partes = token.split('.');
  var payloadStr = partes[0], firma = partes[1];
  if (!safeEquals_(firma, firmar_(payloadStr))) return null;
  var payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadStr)).getDataAsString());
  } catch (e) {
    return null;
  }
  if (!payload.exp || payload.exp < Date.now()) return null;
  var adminEmail = getScriptProp_('ADMIN_EMAIL');
  if (!adminEmail || payload.email.toLowerCase() !== adminEmail.toLowerCase()) return null;
  return payload;
}

function login(accessToken) {
  var email = verifyGoogleEmail_(accessToken);
  if (!email) throw new Error('Token de Google inválido o expirado.');
  var adminEmail = getScriptProp_('ADMIN_EMAIL');
  if (!adminEmail) throw new Error('El proyecto no ha sido configurado (falta ADMIN_EMAIL). Ejecuta configurarProyecto().');
  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    throw new Error('Esta cuenta de Google no tiene acceso a esta aplicación.');
  }
  return { token: createSessionToken(email), email: email };
}

function requireAuth(token) {
  var payload = verifySessionToken(token);
  if (!payload) throw new Error('Sesión inválida o expirada. Vuelve a iniciar sesión.');
  return payload;
}
