// POST /api/regulacao/acompanhamentos/:id/sessoes
// body: { data_sessao: 'YYYY-MM-DD', horario: 'HH:MM', evolucao: '...', presentes?: [guia_id,...] }
// Cada sessão tem sua própria evolução em texto (registro por sessão).
// 'presentes' é opcional e só faz sentido em atendimento em grupo — se
// omitido, considera-se que todos os vinculados ao acompanhamento estavam
// presentes.

import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoCapability, getRegulacaoScope } from '../../_shared.js';

export async function onRequestPost({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoCapability(
    request, env, 'executor',
    'Apenas Executores podem registrar sessões e evoluções de atendimento.'
  );
  if (error) return error;

  const acompanhamentoId = Number(params.id);
  const acompanhamento = await env.DB_REGULACAO.prepare(
    'SELECT * FROM acompanhamentos WHERE id = ?'
  ).bind(acompanhamentoId).first();
  if (!acompanhamento) return json({ error: 'Acompanhamento não encontrado.' }, 404);

  const scope = await getRegulacaoScope(env, user, access);
  if (!scope.isAdmin && !scope.executantes.includes(acompanhamento.unidade_executante_code)) {
    return json({ error: 'Você não tem acesso a este acompanhamento.' }, 403);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const data_sessao = (body.data_sessao || '').trim();
  const horario = (body.horario || '').trim();
  const evolucao = (body.evolucao || '').trim();
  let presentes = null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_sessao)) return json({ error: 'Data da sessão inválida.' }, 400);
  if (!/^\d{2}:\d{2}$/.test(horario)) return json({ error: 'Horário inválido.' }, 400);
  if (!evolucao) return json({ error: 'Evolução é obrigatória.' }, 400);

  if (Array.isArray(body.presentes) && acompanhamento.tipo === 'grupo') {
    const { results: vinculadas } = await env.DB_REGULACAO.prepare(
      'SELECT guia_id FROM acompanhamento_guias WHERE acompanhamento_id = ?'
    ).bind(acompanhamentoId).all();
    const validGuiaIds = new Set(vinculadas.map((v) => v.guia_id));
    const presentesFiltrados = body.presentes.map(Number).filter((id) => validGuiaIds.has(id));
    presentes = JSON.stringify(presentesFiltrados);
  }

  const result = await env.DB_REGULACAO.prepare(
    `INSERT INTO acompanhamento_sessoes (acompanhamento_id, data_sessao, horario, presentes, evolucao, created_by, profissional_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(acompanhamentoId, data_sessao, horario, presentes, evolucao, user.id, user.id).run();

  await logAudit(env, user, 'create', 'sessao', result.meta.last_row_id, { acompanhamentoId });

  const sessao = await env.DB_REGULACAO.prepare('SELECT * FROM acompanhamento_sessoes WHERE id = ?')
    .bind(result.meta.last_row_id).first();
  return json({ sessao: { ...sessao, presentes: sessao.presentes ? JSON.parse(sessao.presentes) : null } }, 201);
}
