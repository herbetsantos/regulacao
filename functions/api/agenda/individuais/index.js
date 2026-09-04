import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess } from '../../_shared.js';
import { canManageProfessional, defaultDuration, validDate, validTime } from '../_agenda.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  const url = new URL(request.url);
  let profissionalId = Number(url.searchParams.get('profissional_user_id') || user.id);
  if (!access.administrador) profissionalId = user.id;
  const { results } = await env.DB_REGULACAO.prepare(`
    SELECT ai.*, g.codigo_guia, p.nome AS paciente_nome, e.nome AS especialidade_nome
    FROM agenda_individuais ai
    JOIN guias g ON g.id = ai.guia_id
    JOIN pacientes p ON p.cpf = g.cpf
    JOIN especialidades e ON e.id = ai.especialidade_id
    WHERE ai.profissional_user_id = ?
    ORDER BY ai.data_atendimento DESC, ai.hora_inicio DESC LIMIT 100
  `).bind(profissionalId).all();
  return json({ atendimentos: results || [] });
}

export async function onRequestPost({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.executor && !access.administrador) return json({ error: 'Apenas Executor ou Administrador pode agendar atendimento.' }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const guiaId = Number(body.guia_id);
  const profissionalId = Number(body.profissional_user_id || user.id);
  const equipeId = Number(body.equipe_id);
  const unidadeCode = String(body.unidade_code || '').trim();
  const dataAtendimento = String(body.data_atendimento || '');
  const horaInicio = String(body.hora_inicio || '');
  const blocos = Math.max(1, Math.min(8, Number(body.blocos || 1)));
  const guia = await env.DB_REGULACAO.prepare('SELECT * FROM guias WHERE id = ?').bind(guiaId).first();
  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);
  if (!['lista_espera', 'em_atendimento'].includes(guia.situacao)) return json({ error: 'A guia deve estar em Lista de espera ou Em atendimento.' }, 409);
  if (!validDate(dataAtendimento) || !validTime(horaInicio)) return json({ error: 'Data ou horário inválido.' }, 400);
  const chk = await canManageProfessional(env, user, access, equipeId, profissionalId, guia.especialidade_id, unidadeCode);
  if (chk.error) return chk.error;
  const duracaoMinutos = (await defaultDuration(env, guia.especialidade_id)) * blocos;
  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_individuais (guia_id, profissional_user_id, especialidade_id, equipe_id, unidade_code, data_atendimento, hora_inicio, duracao_minutos, observacao, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(guiaId, profissionalId, guia.especialidade_id, equipeId, unidadeCode, dataAtendimento, horaInicio, duracaoMinutos, String(body.observacao || '').trim() || null, user.id).run();
  await env.DB_REGULACAO.prepare("UPDATE guias SET situacao = 'em_atendimento', updated_at = datetime('now') WHERE id = ?").bind(guiaId).run();
  await logAudit(env, user, 'create', 'agenda_individual', result.meta.last_row_id, { guiaId, profissionalId, duracaoMinutos });
  return json({ id: result.meta.last_row_id, duracao_minutos: duracaoMinutos }, 201);
}
