// Utilidades centrais — eMulti / Regulação 2.26.3
// O Apoio APS Cajamar fornece uma opção de autenticação integrada.
// A Regulação também pode autenticar credenciais internas próprias, mantidas no regulacao-vagas-db.

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

function randomHex(numBytes) {
  const bytes = new Uint8Array(numBytes);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_TTL_SECONDS = 8 * 60 * 60;

export async function upsertPortalPrincipal(env, portalUser) {
  const pid = `portal:${portalUser.id}`;
  await env.DB_REGULACAO.prepare(`
    INSERT INTO regulacao_principals(principal_id,portal_user_id,username,name,portal_role,active,first_seen_at,last_seen_at)
    VALUES(?,?,?,?,?,1,datetime('now'),datetime('now'))
    ON CONFLICT(principal_id) DO UPDATE SET
      portal_user_id=excluded.portal_user_id,
      username=excluded.username,
      name=excluded.name,
      portal_role=excluded.portal_role,
      active=1,
      last_seen_at=datetime('now')
  `).bind(pid, Number(portalUser.id), portalUser.username || null, portalUser.name || portalUser.username || 'Usuário', portalUser.role || null).run();

  // Bootstrap único: se ainda não existir nenhum superusuário local, o primeiro
  // Super Administrador autenticado pelo Portal assume essa função na Regulação.
  // Depois disso, o papel do Portal não concede nem revoga privilégios no módulo.
  if (portalUser.role === 'super_admin') {
    const hasLocalSuperuser = await env.DB_REGULACAO.prepare('SELECT 1 ok FROM regulacao_superusers LIMIT 1').first();
    if (!hasLocalSuperuser) {
      await env.DB_REGULACAO.prepare(
        `INSERT OR IGNORE INTO regulacao_superusers(principal_id,granted_by_principal) VALUES(?,?)`
      ).bind(pid, 'bootstrap:portal').run();
    }
  }
  return pid;
}


export async function upsertLocalPrincipal(env, localUser) {
  const pid = `local:${localUser.id}`;
  await env.DB_REGULACAO.prepare(`
    INSERT INTO regulacao_principals(principal_id,portal_user_id,username,name,portal_role,active,first_seen_at,last_seen_at)
    VALUES(?,NULL,?,?,NULL,?,datetime('now'),datetime('now'))
    ON CONFLICT(principal_id) DO UPDATE SET
      username=excluded.username,
      name=excluded.name,
      active=excluded.active,
      last_seen_at=datetime('now')
  `).bind(pid, localUser.username || null, localUser.name || localUser.username || 'Usuário interno', localUser.active ? 1 : 0).run();
  return pid;
}

export async function consumeHandoffToken(env, token) {
  if (!token) return null;
  // ÚNICO ponto operacional em que o banco do Portal é consultado além da autenticação.
  const row = await env.DB.prepare(`
    SELECT h.user_id,h.expires_at,h.used,u.username,u.name,u.role,u.active
    FROM handoff_tokens h
    JOIN users u ON u.id=h.user_id
    WHERE h.token=?
  `).bind(token).first();
  if (!row || row.used || !row.active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  const upd = await env.DB.prepare('UPDATE handoff_tokens SET used=1 WHERE token=? AND used=0').bind(token).run();
  if (!upd.meta?.changes) return null;
  const identity = { id:Number(row.user_id), username:row.username, name:row.name, role:row.role, source:'portal' };
  identity.principalId = await upsertPortalPrincipal(env, identity);
  return identity;
}

export async function createSession(env, identity) {
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const pid = identity.principalId || await upsertPortalPrincipal(env, identity);
  await env.DB_REGULACAO.prepare(
    `INSERT INTO regulacao_auth_sessions(token,principal_id,expires_at,created_at,last_seen_at)
     VALUES(?,?,?,datetime('now'),datetime('now'))`
  ).bind(token, pid, expiresAt).run();
  return token;
}

export function sessionCookieHeader(token, maxAgeSeconds = SESSION_TTL_SECONDS) {
  return `emulti_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookieHeader() {
  return 'emulti_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

export async function getAuthUser(request, env) {
  const token = getCookie(request, 'emulti_session');
  if (!token) return null;
  let row;
  try {
    row = await env.DB_REGULACAO.prepare(`
      SELECT s.expires_at,p.principal_id,p.portal_user_id,p.username,p.name,p.portal_role,p.active,
             CASE WHEN su.principal_id IS NULL THEN 0 ELSE 1 END AS is_superuser,
             lu.id AS local_user_id,lu.legacy_numeric_id,lu.active AS local_active,
             lu.must_change_password
      FROM regulacao_auth_sessions s
      JOIN regulacao_principals p ON p.principal_id=s.principal_id
      LEFT JOIN regulacao_superusers su ON su.principal_id=p.principal_id
      LEFT JOIN regulacao_local_users lu ON p.principal_id=('local:' || lu.id)
      WHERE s.token=?
    `).bind(token).first();
  } catch (err) {
    if (!String(err?.message || '').toLowerCase().includes('regulacao_local_users')) throw err;
    row = await env.DB_REGULACAO.prepare(`
      SELECT s.expires_at,p.principal_id,p.portal_user_id,p.username,p.name,p.portal_role,p.active,
             CASE WHEN su.principal_id IS NULL THEN 0 ELSE 1 END AS is_superuser,
             NULL AS local_user_id,NULL AS legacy_numeric_id,NULL AS local_active,
             0 AS must_change_password
      FROM regulacao_auth_sessions s
      JOIN regulacao_principals p ON p.principal_id=s.principal_id
      LEFT JOIN regulacao_superusers su ON su.principal_id=p.principal_id
      WHERE s.token=?
    `).bind(token).first();
  }
  if (!row || !row.active) return null;
  const source = String(row.principal_id || '').startsWith('local:') ? 'local' : 'portal';
  if (source === 'local' && !row.local_active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB_REGULACAO.prepare('DELETE FROM regulacao_auth_sessions WHERE token=?').bind(token).run();
    return null;
  }
  env.DB_REGULACAO.prepare("UPDATE regulacao_auth_sessions SET last_seen_at=datetime('now') WHERE token=?").bind(token).run().catch(()=>{});
  if (source === 'local') {
    return {
      id:Number(row.legacy_numeric_id),
      localUserId:String(row.local_user_id),
      principalId:row.principal_id,
      source:'local',
      username:row.username,
      name:row.name,
      role:'internal',
      isSuperAdmin:!!row.is_superuser,
      active:true,
      mustChangePassword:!!row.must_change_password,
    };
  }
  return {
    id:Number(row.portal_user_id),
    principalId:row.principal_id,
    source:'portal',
    username:row.username,
    name:row.name,
    role:row.portal_role,
    isSuperAdmin:!!row.is_superuser,
    active:true,
    mustChangePassword:false,
  };
}

export async function logAudit(env, actor, action, entityType, entityId, details) {
  const detailsStr = details == null ? null : (typeof details === 'string' ? details : JSON.stringify(details));
  try {
    await env.DB_REGULACAO.prepare(`
      INSERT INTO regulacao_local_audit(id,actor_principal_id,actor_username,action,entity_type,entity_id,details)
      VALUES(?,?,?,?,?,?,?)
    `).bind(crypto.randomUUID(), actor?.principalId || (actor?.source === 'local' && actor?.localUserId ? `local:${actor.localUserId}` : (actor?.id != null ? `portal:${actor.id}` : null)), actor?.username || null, action, entityType, String(entityId ?? ''), detailsStr).run();
  } catch { /* auditoria é best effort */ }
}

export async function requireSuperAdmin(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error:json({error:'Não autenticado.'},401) };
  if (!user.isSuperAdmin) return { error:json({error:'Acesso restrito ao Superusuário da Regulação.'},403) };
  return { user };
}
