import { json, requireAdminPanel, getAdminUnidades, logAudit } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { user: admin, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const action = body.action;
  if (action !== 'approve' && action !== 'reject') {
    return json({ error: 'Ação inválida.' }, 400);
  }

  const reqRow = await env.DB.prepare(
    'SELECT id, name, username, password_hash, salt, unidade, status FROM signup_requests WHERE id = ?'
  ).bind(id).first();
  if (!reqRow) return json({ error: 'Solicitação não encontrada.' }, 404);
  if (reqRow.status !== 'pending') return json({ error: 'Esta solicitação já foi resolvida.' }, 409);

  if (admin.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, admin.id)).map((u) => u.toLowerCase());
    if (!reqRow.unidade || !minhas.includes(reqRow.unidade.toLowerCase())) {
      return json({ error: 'Esta solicitação não é de uma unidade sob sua gestão.' }, 403);
    }
  }

  if (action === 'reject') {
    await env.DB.prepare(
      `UPDATE signup_requests SET status = 'rejected', resolved_at = datetime('now'), resolved_by = ? WHERE id = ?`
    ).bind(admin.id, id).run();
    await logAudit(env, admin, 'reject_signup_request', 'signup_request', id, { username: reqRow.username });
    return json({ ok: true });
  }

  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE lower(username) = ?').bind(reqRow.username).first();
  if (existingUser) {
    return json({ error: 'Já existe um usuário com esse login. Rejeite esta solicitação e oriente a pessoa a tentar outro usuário.' }, 409);
  }

  await env.DB.prepare(
    'INSERT INTO users (username, name, password_hash, salt, role, unidade) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(reqRow.username, reqRow.name, reqRow.password_hash, reqRow.salt, 'user', reqRow.unidade)
    .run();

  await env.DB.prepare(
    `UPDATE signup_requests SET status = 'approved', resolved_at = datetime('now'), resolved_by = ? WHERE id = ?`
  ).bind(admin.id, id).run();

  await logAudit(env, admin, 'approve_signup_request', 'signup_request', id, { username: reqRow.username, unidade: reqRow.unidade });

  return json({ ok: true });
}
