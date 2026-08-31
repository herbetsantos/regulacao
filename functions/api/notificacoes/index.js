// GET /api/notificacoes -> notificações não lidas POR ESTE USUÁRIO, das
// equipes das quais ele é profissional. Admin/super_admin veem as de
// TODAS as equipes (consistente com o acesso irrestrito deles).

import { json } from '../_utils.js';
import { requireRegulacaoAccess, getUserEquipeIds, inClause } from '../_shared.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  let equipeIds;
  if (access.administrador) {
    const { results } = await env.DB.prepare('SELECT id FROM regulacao_equipes WHERE ativo = 1').all();
    equipeIds = results.map((r) => r.id);
  } else {
    equipeIds = await getUserEquipeIds(env, user);
  }

  if (equipeIds.length === 0) return json({ notificacoes: [] });

  const { clause, binds } = inClause(equipeIds);
  const { results } = await env.DB_REGULACAO.prepare(
    `SELECT n.* FROM notificacoes n
     WHERE n.equipe_id IN ${clause}
       AND NOT EXISTS (
         SELECT 1 FROM notificacao_lidas nl
         WHERE nl.notificacao_id = n.id AND nl.user_id = ?
       )
     ORDER BY n.created_at DESC
     LIMIT 50`
  ).bind(...binds, user.id).all();

  return json({ notificacoes: results });
}
