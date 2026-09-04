// Funções utilitárias deste projeto (Regulação de Vagas).
//
// Este projeto NÃO faz login/hash de senha — isso continua acontecendo
// exclusivamente no Portal Saúde Cajamar. Aqui a gente só LÊ a mesma tabela
// `sessions`/`users` (via o mesmo binding D1, env.DB, apontando para o banco
// portal-saude-db) pra validar o cookie de sessão que o portal já criou.
// Ver docs/instalacao/INSTALL.md para o requisito de COOKIE_DOMAIN compartilhado entre os
// dois projetos.

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

export function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Retorna o usuário autenticado (sem dados sensíveis) ou null. Idêntico em
// comportamento ao getAuthUser do portal — precisa continuar assim, já que
// os dois projetos leem a mesma tabela `sessions`.
export async function getAuthUser(request, env) {
  const token = getCookie(request, 'session');
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT s.expires_at, u.id, u.username, u.name, u.role, u.active, u.must_change_password
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  ).bind(token).first();

  if (!row) return null;
  if (!row.active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Sessão expirada: apaga por conta própria (mesmo comportamento do
    // portal) — como as duas tabelas são a mesma, isso também "desloga" a
    // pessoa do lado do portal.
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    mustChangePassword: !!row.must_change_password,
  };
}

// Trilha de auditoria — grava na mesma tabela audit_log do portal (banco
// compartilhado), então as ações deste módulo aparecem no mesmo histórico
// que o admin já usa em Administração > Auditoria.
export async function logAudit(env, actor, action, entityType, entityId, details) {
  try {
    const detailsStr = details == null
      ? null
      : (typeof details === 'string' ? details : JSON.stringify(details));
    await env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, actor_username, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(actor?.id ?? null, actor?.username ?? null, action, entityType, String(entityId ?? ''), detailsStr).run();
  } catch {
    // best-effort — auditoria não pode quebrar a operação principal.
  }
}

// --- Consumo do código de repasse (handoff) ---
// Este projeto está em um domínio *.pages.dev DIFERENTE do portal, então
// não recebe o cookie de sessão automaticamente. Em vez disso, quando o
// portal manda o usuário pra cá com ?handoff=TOKEN, a gente troca esse
// código (de uso único, 60s de validade) por uma sessão PRÓPRIA — inserida
// na MESMA tabela `sessions` do banco compartilhado, então funciona
// exatamente como se o usuário tivesse logado aqui direto.

const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 horas, igual ao portal

function randomHex(numBytes) {
  const bytes = new Uint8Array(numBytes);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Valida e CONSOME (uso único) um código de repasse. Retorna o user_id se
// válido, ou null se inválido/expirado/já usado.
export async function consumeHandoffToken(env, token) {
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT user_id, expires_at, used FROM handoff_tokens WHERE token = ?'
  ).bind(token).first();
  if (!row || row.used) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await env.DB.prepare('UPDATE handoff_tokens SET used = 1 WHERE token = ?').bind(token).run();
  return row.user_id;
}

// Cria uma sessão nova (mesma tabela `sessions` do portal) para o user_id
// resolvido pelo código de repasse.
export async function createSession(env, userId) {
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run();
  return token;
}

// Cookie HOST-ONLY (sem atributo Domain) — este projeto tem seu próprio
// domínio *.pages.dev, então não precisa nem deve tentar compartilhar o
// cookie com o portal (isso é papel do handoff, não do cookie).
export function sessionCookieHeader(token, maxAgeSeconds = SESSION_TTL_SECONDS) {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export async function requireSuperAdmin(request, env) { const user=await getAuthUser(request,env); if(!user)return {error:json({error:'Não autenticado.'},401)}; if(user.role!=='super_admin')return {error:json({error:'Acesso restrito ao Super Administrador.'},403)}; return {user}; }
