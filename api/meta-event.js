// /api/meta-event — prueba minima de Meta Conversions API (solo servidor).
// Lee META_CAPI_TOKEN, META_PIXEL_ID y META_API_SECRET desde process.env.
// Nunca expone secretos al cliente ni en logs.
// No envia PII (sin nombre, email, telefono) ni datos clinicos.

// Version explicita de Meta Graph API (centralizada para futuras actualizaciones).
var META_GRAPH_API_VERSION = 'v21.0';

// Allowlist de eventos permitidos en esta fase de prueba.
var ALLOWED_EVENTS = {
  ViewContent: true,
  Contact: true,
  Lead: true,
  InitiateCheckout: true,
  Schedule: true,
  Purchase: true,
};

// Limite practico del body (proteccion contra requests absurdamente grandes).
// Nota: Vercel ya aplica su propio limite al parser; esto es una segunda barrera en codigo.
var MAX_BODY_BYTES = 32 * 1024;

function getClientIp(req) {
  var fwd = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return String(fwd[0]).split(',')[0].trim();
  }
  var realIp = req.headers['x-real-ip'] || req.headers['X-Real-Ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp.trim();
  }
  if (req.socket && req.socket.remoteAddress) {
    return String(req.socket.remoteAddress);
  }
  return undefined;
}

function randomEventId() {
  try {
    var crypto = require('crypto');
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
}

function secretsMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') {
    return false;
  }
  if (provided.length === 0 || expected.length === 0) {
    return false;
  }
  try {
    var crypto = require('crypto');
    var a = Buffer.from(provided, 'utf8');
    var b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return provided === expected;
  }
}

function bodySizeBytes(body) {
  try {
    var text = typeof body === 'string' ? body : JSON.stringify(body);
    return Buffer.byteLength(text || '', 'utf8');
  } catch (e) {
    return MAX_BODY_BYTES + 1;
  }
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  var trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return false;
  }
  try {
    var parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-meta-api-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metodo no permitido. Usa POST.' });
  }

  // Autenticacion: header obligatorio comparado con el secreto del servidor.
  // Se verifica ANTES de cualquier llamada a Meta.
  var expectedSecret = process.env.META_API_SECRET;
  if (!expectedSecret) {
    return res.status(500).json({
      success: false,
      error: 'Endpoint no configurado en el servidor (falta secreto).',
    });
  }
  var rawHeader = req.headers['x-meta-api-secret'];
  var providedSecret = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!secretsMatch(providedSecret, expectedSecret)) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }

  var token = process.env.META_CAPI_TOKEN;
  var pixelId = process.env.META_PIXEL_ID;
  if (!token || !pixelId) {
    return res.status(500).json({
      success: false,
      error: 'Faltan variables de entorno en el servidor: META_CAPI_TOKEN y/o META_PIXEL_ID.',
    });
  }

  var body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Body JSON invalido.' });
    }
  }
  if (!body || typeof body !== 'object') {
    body = {};
  }
  if (bodySizeBytes(body) > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, error: 'Body demasiado grande.' });
  }

  var eventName = typeof body.event_name === 'string' ? body.event_name.trim() : '';
  if (!eventName) {
    return res.status(400).json({ success: false, error: 'Falta event_name (ej. ViewContent).' });
  }
  if (!ALLOWED_EVENTS[eventName]) {
    return res.status(400).json({
      success: false,
      error: 'event_name no permitido. Permitidos: ViewContent, Contact, Lead, InitiateCheckout, Schedule, Purchase.',
    });
  }

  var eventSourceUrl =
    (typeof body.event_source_url === 'string' && body.event_source_url.trim()) ||
    req.headers.referer ||
    req.headers.referrer ||
    '';
  if (!isValidHttpUrl(eventSourceUrl)) {
    return res.status(400).json({ success: false, error: 'event_source_url debe ser una URL http(s) valida.' });
  }

  var eventId =
    (typeof body.event_id === 'string' && body.event_id.trim()) || randomEventId();
  var eventTime = Math.floor(Date.now() / 1000);

  var userData = {};
  var ip = getClientIp(req);
  if (ip) {
    userData.client_ip_address = ip;
  }
  var ua = req.headers['user-agent'];
  if (typeof ua === 'string' && ua.length > 0) {
    userData.client_user_agent = ua;
  }

  var currency =
    (typeof body.currency === 'string' && body.currency.trim().toUpperCase()) || 'MXN';
  if (!/^[A-Z]{3}$/.test(currency)) {
    return res.status(400).json({ success: false, error: 'currency debe ser codigo ISO de 3 letras (ej. MXN).' });
  }

  var hasValue =
    body.value !== undefined && body.value !== null && body.value !== '';
  var value = null;
  if (hasValue) {
    value = Number(body.value);
    if (!Number.isFinite(value) || value < 0) {
      return res.status(400).json({ success: false, error: 'value debe ser numerico y mayor o igual a 0.' });
    }
  }
  if (eventName === 'Purchase' && !hasValue) {
    return res.status(400).json({ success: false, error: 'Purchase requiere value numerico mayor o igual a 0.' });
  }

  var customData = {};
  if (hasValue) {
    customData.value = value;
    customData.currency = currency;
  }

  var eventData = {
    event_name: eventName,
    event_time: eventTime,
    action_source: 'website',
    event_source_url: eventSourceUrl,
    event_id: eventId,
    user_data: userData,
  };
  if (Object.keys(customData).length > 0) {
    eventData.custom_data = customData;
  }

  var payload = { data: [eventData] };
  var testCode = process.env.META_TEST_EVENT_CODE;
  if (typeof testCode === 'string' && testCode.trim().length > 0) {
    payload.test_event_code = testCode.trim();
  }

  var url =
    'https://graph.facebook.com/' +
    META_GRAPH_API_VERSION +
    '/' +
    encodeURIComponent(pixelId) +
    '/events?access_token=' +
    encodeURIComponent(token);

  var metaStatus = 0;
  var metaJson = null;
  try {
    var metaRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    metaStatus = metaRes.status;
    try {
      metaJson = await metaRes.json();
    } catch (e) {
      metaJson = { raw: await metaRes.text() };
    }
  } catch (e) {
    return res.status(502).json({
      success: false,
      error: 'No se pudo contactar a Meta: ' + (e && e.message ? e.message : String(e)),
    });
  }

  if (metaStatus < 200 || metaStatus >= 300 || (metaJson && metaJson.error)) {
    var metaError =
      (metaJson && metaJson.error && (metaJson.error.error_user_msg || metaJson.error.message)) ||
      'Meta rechazo el evento (HTTP ' + metaStatus + ').';
    return res.status(502).json({ success: false, error: metaError, meta: metaJson });
  }

  return res.status(200).json({
    success: true,
    event_name: eventName,
    event_id: eventId,
    meta: metaJson,
  });
};
