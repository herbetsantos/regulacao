import { json } from '../_utils.js';

export function normalizeOuvidoriaCode(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function bumpOuvidoriaVersion(env) {
  await env.DB.prepare(
    `INSERT INTO ouvidoria_config (id, confidence_threshold, versao, updated_at)
     VALUES (1, 0.80, 1, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET versao = versao + 1, updated_at = datetime('now')`
  ).run();
}

export function extensionCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = origin === 'https://ouvidor.saude.gov.br'
    || origin.startsWith('chrome-extension://')
    || origin.startsWith('moz-extension://')
    || origin === 'http://localhost'
    || origin.startsWith('http://127.0.0.1');
  const h = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, X-Ouvidoria-Key, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
  if (allowed) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function tokenFromRequest(request) {
  const auth = request.headers.get('Authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || (request.headers.get('X-Ouvidoria-Key') || '').trim();
}

export function requireExtensionToken(request, env) {
  const expected = String(env.OUVIDORIA_EXTENSION_TOKEN || '').trim();
  if (!expected) {
    return { error: json({ error: 'Integração da extensão ainda não configurada no Portal.' }, 503, extensionCorsHeaders(request)) };
  }
  const provided = tokenFromRequest(request);
  if (!provided || provided !== expected) {
    return { error: json({ error: 'Chave de integração inválida.' }, 401, extensionCorsHeaders(request)) };
  }
  return { ok: true };
}

export function parseActive(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue ? 1 : 0;
  return value === false || value === 0 || value === '0' ? 0 : 1;
}

export function validEmail(value) {
  if (!value) return true;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value).trim());
}
