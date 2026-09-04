// Funções utilitárias compartilhadas pelas Cloudflare Pages Functions.
// Usa apenas Web Crypto (disponível nativamente no runtime dos Workers).

export function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export function randomHex(numBytes) {
  const arr = new Uint8Array(numBytes);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const saltBytes = hexToBuf(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bufToHex(bits);
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const computed = await hashPassword(password, saltHex);
  // comparação em tempo constante
  if (computed.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

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

const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 horas

// COOKIE_DOMAIN é opcional (definido em wrangler.toml [vars] ou nas
// variáveis de ambiente do Cloudflare Pages). Quando definido (ex.:
// ".saude.cajamar.sp.gov.br"), o cookie de sessão passa a valer em todos os
// subdomínios daquele domínio — é isso que permite o mesmo login funcionar
// no Portal e num projeto separado, como o de Regulação de Vagas.
// Quando NÃO definido (comportamento atual, sem alteração), o cookie fica
// restrito ao host exato — mantém compatibilidade total com quem não usa
// subdomínio nenhum.
export function sessionCookieHeader(token, env, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const domainAttr = env?.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : '';
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${domainAttr}`;
}

export function clearSessionCookieHeader(env) {
  const domainAttr = env?.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : '';
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0${domainAttr}`;
}

export async function createSession(env, userId) {
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expiresAt)
    .run();
  return token;
}

// Retorna o usuário autenticado (sem dados sensíveis) ou null.
export async function getAuthUser(request, env) {
  const token = getCookie(request, 'session');
  if (!token) return null;

const row = await env.DB.prepare(
    `SELECT s.expires_at, u.id, u.username, u.name, u.role, u.active, u.unidade, u.must_change_password
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  )
    .bind(token)
    .first();

  if (!row) return null;
  if (!row.active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }

return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    unidade: row.unidade,
    mustChangePassword: !!row.must_change_password,
  };
}

export async function requireAuth(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };
  return { user };
}

export async function requireAdmin(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return { error: json({ error: 'Acesso restrito ao administrador.' }, 403) };
  }
  return { user };
}

export async function requireSuperAdmin(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };
  if (user.role !== 'super_admin') {
    return { error: json({ error: 'Acesso restrito ao Super Administrador.' }, 403) };
  }
  return { user };
}

export async function requireAdminPanel(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };
  if (!['admin', 'super_admin', 'admin_unidade'].includes(user.role)) {
    return { error: json({ error: 'Acesso restrito ao administrador.' }, 403) };
  }
  return { user };
}

// ── Cloudflare Turnstile (CAPTCHA) ──────────────────────────────────────────
// Verifica o token enviado pelo widget no formulário público de solicitação
// de acesso. Requer a variável de ambiente TURNSTILE_SECRET_KEY configurada
// no Pages (Settings > Environment variables) — nunca commitada no código.
// Se a variável não estiver configurada, a verificação é pulada (permite
// rodar em ambiente de desenvolvimento sem Turnstile configurado), mas em
// produção ela deve sempre estar presente.
export async function verifyTurnstile(token, env, ip) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.append('secret', env.TURNSTILE_SECRET_KEY);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

// Extrai o IP do cliente a partir do cabeçalho que a Cloudflare já injeta em
// toda requisição (não pode ser forjado pelo cliente, ao contrário de
// X-Forwarded-For).
export function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'desconhecido';
}

// ── Rate limiting de login (força bruta) ───────────────────────────────────
// Janela e limites conservadores: bloqueia por usuário E por IP, o que dá
// alguma proteção tanto contra "adivinhar a senha de 1 conta" quanto contra
// "testar 1 senha comum em muitas contas" a partir do mesmo IP.
const LOGIN_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_USERNAME = 5;
const MAX_ATTEMPTS_PER_IP = 20;

// Retorna { allowed: true } ou { allowed: false, retryAfterMinutes }.
export async function checkLoginRateLimit(env, username, ip) {
  const since = `-${LOGIN_WINDOW_MINUTES} minutes`;

  const byUser = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM login_attempts
     WHERE username = ? AND success = 0 AND created_at > datetime('now', ?)`
  ).bind(username, since).first();

  const byIP = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM login_attempts
     WHERE ip = ? AND success = 0 AND created_at > datetime('now', ?)`
  ).bind(ip, since).first();

  if ((byUser?.count || 0) >= MAX_ATTEMPTS_PER_USERNAME || (byIP?.count || 0) >= MAX_ATTEMPTS_PER_IP) {
    return { allowed: false, retryAfterMinutes: LOGIN_WINDOW_MINUTES };
  }
  return { allowed: true };
}

export async function recordLoginAttempt(env, username, ip, success) {
  await env.DB.prepare(
    'INSERT INTO login_attempts (username, ip, success) VALUES (?, ?, ?)'
  ).bind(username, ip, success ? 1 : 0).run();
}

// ── Limpeza oportunista de sessões expiradas ────────────────────────────────
// O Cloudflare Pages Functions não tem suporte a Cron Triggers/handler
// "scheduled" (isso só existe hoje em Workers "puros"), então não dá pra
// agendar uma limpeza diária de verdade sem subir um Worker separado. Como
// alternativa simples que não exige infraestrutura extra, toda vez que
// alguém loga há uma chance pequena de também apagar sessões expiradas de
// QUALQUER usuário. Com o tempo isso mantém a tabela `sessions` enxuta.
const SESSION_CLEANUP_PROBABILITY = 0.05; // ~1 em cada 20 logins

export async function maybeCleanupExpiredSessions(env) {
  if (Math.random() < SESSION_CLEANUP_PROBABILITY) {
    try {
      await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
    } catch {
      // Não deixa uma falha de limpeza derrubar o login em si.
    }
  }
}

// ── Trilha de auditoria ─────────────────────────────────────────────────────
// Registra quem fez o quê. `details` pode ser uma string simples ou um
// objeto (é serializado em JSON automaticamente). Nunca lança: uma falha ao
// gravar auditoria não deve impedir a ação principal de completar.
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

export async function getAdminUnidades(env, adminUserId) {
  const { results } = await env.DB.prepare(
    'SELECT unidade FROM admin_unidades WHERE admin_user_id = ?'
  ).bind(adminUserId).all();
  return results.map((r) => r.unidade);
}
