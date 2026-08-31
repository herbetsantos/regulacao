// POST   /api/admin/equipes/:id/profissionais   body: { user_id }
// DELETE /api/admin/equipes/:id/profissionais?user_id=xxx

import { json, logAudit } from '../../../_utils.js';
import { requireAdminAccess } from '../../../_shared.js';

export async function onRequestPost({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const equipeId = Number(params.id);
  const equipe = await env.DB.prepare('SELECT id FROM regulacao_equipes WHERE id = ?').bind(equipeId).first();
  if (!equipe) return json({ error: 'Equipe não encontrada.' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const userId = Number(body.user_id);
  if (!userId) return json({ error: 'Informe o profissional.' }, 400);

  const profissional = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND active = 1').bind(userId).first();
  if (!profissional) return json({ error: 'Usuário não encontrado.' }, 400);

  await env.DB.prepare(
    'INSERT OR IGNORE INTO regulacao_equipe_profissionais (equipe_id, user_id) VALUES (?, ?)'
  ).bind(equipeId, userId).run();

  await logAudit(env, user, 'create', 'equipe_profissional', equipeId, { userId });

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const equipeId = Number(params.id);
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get('user_id'));
  if (!userId) return json({ error: 'Informe user_id.' }, 400);

  await env.DB.prepare(
    'DELETE FROM regulacao_equipe_profissionais WHERE equipe_id = ? AND user_id = ?'
  ).bind(equipeId, userId).run();

  await logAudit(env, user, 'delete', 'equipe_profissional', equipeId, { userId });

  return json({ ok: true });
}
