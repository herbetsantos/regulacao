// POST /api/acompanhamentos
// body: { guia_ids: [1,2,...], equipe_id, unidade_executante_code, local_execucao? }
// 1 guia -> tipo 'individual'. 2+ guias -> tipo 'grupo' — podem vir de
// unidades diferentes (a critério do profissional, ao juntar demanda
// parecida de mais de uma unidade da MESMA equipe). Guias ainda sem
// equipe_id são triadas implicitamente para a equipe escolhida aqui; guias
// que já pertencem a OUTRA equipe são rejeitadas (precisam ser transferidas
// antes, via PATCH /api/guias/:id).

import { json, logAudit } from '../_utils.js';
import { requireRegulacaoAccess, isEquipeMember, getEquipeInfo } from '../_shared.js';

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const guiaIds = Array.isArray(body.guia_ids) ? [...new Set(body.guia_ids.map(Number))] : [];
  if (guiaIds.length === 0) return json({ error: 'Informe ao menos uma guia.' }, 400);

  const equipeId = Number(body.equipe_id);
  if (!equipeId) return json({ error: 'Informe a equipe responsável.' }, 400);

  const unidadeExecutanteCode = (body.unidade_executante_code || '').trim();
  if (!unidadeExecutanteCode) return json({ error: 'Informe a unidade executante.' }, 400);

  const localExecucao = (body.local_execucao || '').trim() || null;

  const podeUsarEquipe = await isEquipeMember(env, user, equipeId);
  if (!podeUsarEquipe) return json({ error: 'Você não é profissional desta equipe.' }, 403);

  const equipeInfo = await getEquipeInfo(env, equipeId);
  if (!equipeInfo) return json({ error: 'Equipe não encontrada.' }, 400);
  if (!equipeInfo.unidades.some((u) => u.code === unidadeExecutanteCode)) {
    return json({ error: `A unidade informada não é atendida pela equipe ${equipeInfo.nome}.` }, 400);
  }

  const placeholders = guiaIds.map(() => '?').join(',');
  const { results: guias } = await env.DB_REGULACAO.prepare(
    `SELECT * FROM guias WHERE id IN (${placeholders})`
  ).bind(...guiaIds).all();

  if (guias.length !== guiaIds.length) return json({ error: 'Alguma guia informada não foi encontrada.' }, 404);

  const especialidadeIds = new Set(guias.map((g) => g.especialidade_id));
  if (especialidadeIds.size > 1) {
    return json({ error: 'Todas as guias de um mesmo acompanhamento devem ser da mesma especialidade.' }, 400);
  }

  const guiaDeOutraEquipe = guias.find((g) => g.equipe_id !== null && g.equipe_id !== equipeId);
  if (guiaDeOutraEquipe) {
    return json({ error: `A guia #${guiaDeOutraEquipe.id} já pertence a outra equipe — transfira-a primeiro.` }, 409);
  }

  const jaVinculada = await env.DB_REGULACAO.prepare(
    `SELECT guia_id FROM acompanhamento_guias WHERE guia_id IN (${placeholders})`
  ).bind(...guiaIds).all();
  if (jaVinculada.results.length > 0) {
    return json({ error: 'Uma ou mais guias já estão vinculadas a outro acompanhamento.' }, 409);
  }

  const tipo = guiaIds.length > 1 ? 'grupo' : 'individual';
  const especialidadeId = [...especialidadeIds][0];

  const result = await env.DB_REGULACAO.prepare(
    `INSERT INTO acompanhamentos (tipo, especialidade_id, equipe_id, unidade_executante_code, local_execucao, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(tipo, especialidadeId, equipeId, unidadeExecutanteCode, localExecucao, user.id).run();
  const acompanhamentoId = result.meta.last_row_id;

  for (const guiaId of guiaIds) {
    await env.DB_REGULACAO.prepare(
      'INSERT INTO acompanhamento_guias (acompanhamento_id, guia_id) VALUES (?, ?)'
    ).bind(acompanhamentoId, guiaId).run();
    await env.DB_REGULACAO.prepare(
      `UPDATE guias SET situacao = 'em_atendimento', equipe_id = ?, unidade_executante_code = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(equipeId, unidadeExecutanteCode, guiaId).run();
  }

  await logAudit(env, user, 'create', 'acompanhamento', acompanhamentoId, { tipo, guiaIds, equipeId });

  const acompanhamento = await env.DB_REGULACAO.prepare('SELECT * FROM acompanhamentos WHERE id = ?').bind(acompanhamentoId).first();
  return json({ acompanhamento }, 201);
}
