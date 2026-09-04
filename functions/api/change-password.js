import { json, requireAuth, verifyPassword, hashPassword, randomHex, getCookie, logAudit } from './_utils.js';

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAuth(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return json({ error: 'Informe a senha atual e a nova senha.' }, 400);
  }
  if (newPassword.length < 8) {
    return json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400);
  }

  const row = await env.DB.prepare('SELECT password_hash, salt FROM users WHERE id = ?')
    .bind(user.id)
    .first();

  const ok = await verifyPassword(currentPassword, row.salt, row.password_hash);
  if (!ok) return json({ error: 'Senha atual incorreta.' }, 401);

  const newSalt = randomHex(16);
  const newHash = await hashPassword(newPassword, newSalt);

  await env.DB.prepare(
    'UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0 WHERE id = ?'
  )
    .bind(newHash, newSalt, user.id)
    .run();

  // Invalida todas as OUTRAS sessões deste usuário (mantém só a atual).
  // Protege contra um token vazado ou uma sessão esquecida em outro
  // computador continuar valendo depois que a senha foi trocada.
  const currentToken = getCookie(request, 'session');
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?')
    .bind(user.id, currentToken || '')
    .run();

  await logAudit(env, user, 'change_password', 'user', user.id, 'Usuário trocou a própria senha.');

  return json({ ok: true });
}
