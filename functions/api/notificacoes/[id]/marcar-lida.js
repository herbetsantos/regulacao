// POST /api/notificacoes/:id/marcar-lida -> marca como lida por ESTE
// usuário (não afeta a visão dos outros profissionais da equipe).

import { json } from '../../_utils.js';
import { requireRegulacaoAccess, getUserEquipeIds } from '../../_shared.js';

export async function onRequestPost({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const id = Number(params.id);
  const notificacao = await env.DB_REGULACAO.prepare('SELECT * FROM notificacoes WHERE id = ?').bind(id).first();
  if (!notificacao) return json({ error: 'Notificação não encontrada.' }, 404);

  if (!access.administrador) {
    const equipeIds = await getUserEquipeIds(env, user);
    if (!equipeIds.includes(notificacao.equipe_id)) {
      return json({ error: 'Você não tem acesso a esta notificação.' }, 403);
    }
  }

  await env.DB_REGULACAO.prepare(
    'INSERT OR IGNORE INTO notificacao_lidas (notificacao_id, user_id) VALUES (?, ?)'
  ).bind(id, user.id).run();

  return json({ ok: true });
}
