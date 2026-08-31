// GET /api/regulacao/acompanhamentos/:id -> guias vinculadas + sessões + evoluções

import { json } from '../_utils.js';
import { requireRegulacaoAccess, getRegulacaoScope } from '../_shared.js';

export async function onRequestGet({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const id = Number(params.id);
  const acompanhamento = await env.DB_REGULACAO.prepare('SELECT * FROM acompanhamentos WHERE id = ?').bind(id).first();
  if (!acompanhamento) return json({ error: 'Acompanhamento não encontrado.' }, 404);

  const scope = await getRegulacaoScope(env, user, access);
  if (!scope.isAdmin && !scope.executantes.includes(acompanhamento.unidade_executante_code)) {
    return json({ error: 'Você não tem acesso a este acompanhamento.' }, 403);
  }

  const { results: guias } = await env.DB_REGULACAO.prepare(
    `SELECT g.id, g.cpf, g.situacao, p.nome AS paciente_nome
     FROM acompanhamento_guias ag
     JOIN guias g ON g.id = ag.guia_id
     JOIN pacientes p ON p.cpf = g.cpf
     WHERE ag.acompanhamento_id = ?
     ORDER BY p.nome ASC`
  ).bind(id).all();

  const { results: sessoes } = await env.DB_REGULACAO.prepare(
    `SELECT * FROM acompanhamento_sessoes WHERE acompanhamento_id = ? ORDER BY data_sessao DESC, horario DESC`
  ).bind(id).all();

  return json({
    acompanhamento,
    guias,
    sessoes: sessoes.map((s) => ({ ...s, presentes: s.presentes ? JSON.parse(s.presentes) : null })),
  });
}
