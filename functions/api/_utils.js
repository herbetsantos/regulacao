// Funções utilitárias do eMulti / Regulação de Vagas.
// Desde a v2.19.0 o módulo aceita duas origens de identidade:
//   - Portal APS (cookie session + portal-saude-db)
//   - credencial própria do eMulti (cookie emulti_local_session + regulacao-vagas-db)

import { getLocalUserBySession, principalId } from './_hybrid.js';

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control':'no-store', ...extraHeaders },
  });
}

export function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAuthUser(request, env) {
  const localToken = getCookie(request, 'emulti_local_session');
  if (localToken) {
    try {
      const local = await getLocalUserBySession(env, localToken);
      if (local) return local;
    } catch { /* migração local ainda não aplicada */ }
  }

  const token = getCookie(request, 'session');
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT s.expires_at, u.id, u.username, u.name, u.role, u.active, u.must_change_password
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  ).bind(token).first();
  if (!row || !row.active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return {
    id: row.id,
    principalId:`portal:${row.id}`,
    source:'portal',
    username: row.username,
    name: row.name,
    role: row.role,
    mustChangePassword: !!row.must_change_password,
  };
}

export async function logAudit(env, actor, action, entityType, entityId, details) {
  const detailsStr = details == null ? null : (typeof details === 'string' ? details : JSON.stringify(details));
  if (actor?.source === 'local') {
    try {
      await env.DB_REGULACAO.prepare(
        `INSERT INTO regulacao_local_audit(id,actor_principal_id,actor_username,action,entity_type,entity_id,details)
         VALUES(?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), principalId(actor), actor.username || null, action, entityType, String(entityId ?? ''), detailsStr).run();
    } catch { /* best effort */ }
    return;
  }
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, actor_username, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(actor?.id ?? null, actor?.username ?? null, action, entityType, String(entityId ?? ''), detailsStr).run();
  } catch { /* best effort */ }
}

const SESSION_TTL_SECONDS = 8 * 60 * 60;
function randomHex(numBytes) {
  const bytes = new Uint8Array(numBytes);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function consumeHandoffToken(env, token) {
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT user_id, expires_at, used FROM handoff_tokens WHERE token = ?'
  ).bind(token).first();
  if (!row || row.used) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  const upd = await env.DB.prepare('UPDATE handoff_tokens SET used = 1 WHERE token = ? AND used=0').bind(token).run();
  if (!upd.meta?.changes) return null;
  return row.user_id;
}

export async function createSession(env, userId) {
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run();
  return token;
}

export function sessionCookieHeader(token, maxAgeSeconds = SESSION_TTL_SECONDS) {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export async function requireSuperAdmin(request, env) {
  const user = await getAuthUser(request,env);
  if (!user) return {error:json({error:'Não autenticado.'},401)};
  if (user.source !== 'portal' || user.role !== 'super_admin') return {error:json({error:'Acesso restrito ao Super Administrador do Portal APS.'},403)};
  return {user};
}
