// Um profissional pertence a no máximo UMA equipe eMulti.
// POST   /api/admin/equipes/:id/profissionais   body: { user_id }
// DELETE /api/admin/equipes/:id/profissionais?user_id=xxx

import { json, logAudit } from '../../../_utils.js';
import { requireAdminAccess } from '../../../_shared.js';

export async function onRequestPost({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const equipeId = Number(params.id);
  const equipe = await env.DB.prepare('SELECT id, nome FROM regulacao_equipes WHERE id = ? AND ativo = 1').bind(equipeId).first();
  if (!equipe) return json({ error: 'Equipe não encontrada ou inativa.' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const userId = Number(body.user_id);
  if (!userId) return json({ error: 'Informe o profissional.' }, 400);

  const profissional = await env.DB.prepare('SELECT id, name FROM users WHERE id = ? AND active = 1').bind(userId).first();
  if (!profissional) return json({ error: 'Usuário não encontrado.' }, 400);

  const vinculoAtual = await env.DB.prepare(
    `SELECT ep.equipe_id, e.nome AS equipe_nome
     FROM regulacao_equipe_profissionais ep
     JOIN regulacao_equipes e ON e.id = ep.equipe_id
     WHERE ep.user_id = ?
     LIMIT 1`
  ).bind(userId).first();

  if (vinculoAtual && Number(vinculoAtual.equipe_id) !== equipeId) {
    return json({
      error: `${profissional.name} já está vinculado à equipe ${vinculoAtual.equipe_nome}. Remova o vínculo atual antes de vincular a outra equipe.`,
      equipe_atual: { id: vinculoAtual.equipe_id, nome: vinculoAtual.equipe_nome },
    }, 409);
  }

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
