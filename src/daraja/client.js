const { request } = require('undici');
const TIMEOUT_MS = 30_000;

async function callDaraja({ url, method = 'POST', headers = {}, body = undefined, requestId }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await request(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.body.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (res.statusCode >= 400) {
      const err = new Error('Daraja error');
      err.status = res.statusCode;
      err.details = json;
      err.requestId = requestId;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callDaraja };

