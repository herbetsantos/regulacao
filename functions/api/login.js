import {
  json,
  verifyPassword,
  createSession,
  sessionCookieHeader,
  getClientIP,
  checkLoginRateLimit,
  recordLoginAttempt,
  maybeCleanupExpiredSessions,
} from './_utils.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';
  const ip = getClientIP(request);

  if (!username || !password) {
    return json({ error: 'Informe usuário e senha.' }, 400);
  }

  // Bloqueia por alguns minutos após muitas tentativas falhas seguidas para
  // o mesmo usuário ou vindas do mesmo IP (proteção contra força bruta).
  const rateLimit = await checkLoginRateLimit(env, username, ip);
  if (!rateLimit.allowed) {
    return json(
      { error: `Muitas tentativas de login. Tente novamente em alguns minutos.` },
      429
    );
  }

  const user = await env.DB.prepare(
    'SELECT id, username, name, password_hash, salt, role, active, must_change_password FROM users WHERE lower(username) = ?'
  )
    .bind(username)
    .first();

  // Mensagem genérica em caso de erro, para não revelar se o usuário existe.
  const invalidMsg = { error: 'Usuário ou senha inválidos.' };

  if (!user || !user.active) {
    await recordLoginAttempt(env, username, ip, false);
    return json(invalidMsg, 401);
  }

  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) {
    await recordLoginAttempt(env, username, ip, false);
    return json(invalidMsg, 401);
  }

  await recordLoginAttempt(env, username, ip, true);
  // Aproveita o login bem-sucedido para, ocasionalmente, limpar sessões
  // expiradas de qualquer usuário (ver comentário em maybeCleanupExpiredSessions).
  await maybeCleanupExpiredSessions(env);

  const token = await createSession(env, user.id);

  let theme = null;
  try {
    const themeRow = await env.DB.prepare('SELECT theme FROM users WHERE id = ?').bind(user.id).first();
    if (['auto', 'light', 'dark', 'contrast'].includes(themeRow?.theme)) theme = themeRow.theme;
  } catch {
    // Compatibilidade enquanto database/migrations/legacy/migration_theme_v3.sql ainda não foi executada.
  }

  return json(
    {
      ok: true,
      user: {
        username: user.username,
        name: user.name,
        role: user.role,
        theme,
        mustChangePassword: !!user.must_change_password,
      },
    },
    200,
    { 'Set-Cookie': sessionCookieHeader(token, env) }
  );
}
