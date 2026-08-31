// GET /api/equipes -> equipes do usuário logado (com unidades cobertas por
// cada uma). Admin/super_admin recebem TODAS as equipes ativas.

import { json } from '../_utils.js';
import { requireRegulacaoAccess, getUserEquipeIds, getEquipeInfo } from '../_shared.js';

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  let equipeIds;
  if (user.role === 'admin' || user.role === 'super_admin') {
    const { results } = await env.DB.prepare('SELECT id FROM regulacao_equipes WHERE ativo = 1 ORDER BY nome').all();
    equipeIds = results.map((r) => r.id);
  } else {
    equipeIds = await getUserEquipeIds(env, user);
  }

  const equipes = [];
  for (const id of equipeIds) {
    const info = await getEquipeInfo(env, id);
    if (info) equipes.push(info);
  }
  equipes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return json({ equipes });
}
