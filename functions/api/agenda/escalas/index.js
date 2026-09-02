import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess } from '../../_shared.js';
import { canManageProfessional, validDate, validTime } from '../_agenda.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  const url = new URL(request.url);
  let profissionalId = Number(url.searchParams.get('profissional_user_id') || user.id);
  if (!access.administrador) profissionalId = user.id;
  const { results } = await env.DB_REGULACAO.prepare(`
    SELECT ae.*, e.nome AS especialidade_nome
    FROM agenda_escalas ae
    JOIN especialidades e ON e.id = ae.especialidade_id
    WHERE ae.profissional_user_id = ? AND ae.ativo = 1
    ORDER BY ae.dia_semana, ae.hora_inicio
  `).bind(profissionalId).all();
  return json({ escalas: results || [] });
}

export async function onRequestPost({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.administrador) return json({ error: 'A configuração das escalas é exclusiva do Administrador.' }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const profissionalId = Number(body.profissional_user_id || user.id);
  const especialidadeId = Number(body.especialidade_id);
  const equipeId = Number(body.equipe_id);
  const unidadeCode = String(body.unidade_code || '').trim();
  const diaSemana = Number(body.dia_semana);
  const horaInicio = String(body.hora_inicio || '');
  const horaFim = String(body.hora_fim || '');
  if (!especialidadeId || !equipeId || !unidadeCode || diaSemana < 1 || diaSemana > 7 || !validTime(horaInicio) || !validTime(horaFim) || horaInicio >= horaFim) {
    return json({ error: 'Preencha especialidade, equipe, unidade, dia e intervalo válido.' }, 400);
  }
  const chk = await canManageProfessional(env, user, access, equipeId, profissionalId, especialidadeId, unidadeCode);
  if (chk.error) return chk.error;
  const vigenciaInicio = body.vigencia_inicio ? String(body.vigencia_inicio) : null;
  const vigenciaFim = body.vigencia_fim ? String(body.vigencia_fim) : null;
  if ((vigenciaInicio && !validDate(vigenciaInicio)) || (vigenciaFim && !validDate(vigenciaFim))) return json({ error: 'Vigência inválida.' }, 400);
  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_escalas (profissional_user_id, especialidade_id, equipe_id, unidade_code, dia_semana, hora_inicio, hora_fim, vigencia_inicio, vigencia_fim, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(profissionalId, especialidadeId, equipeId, unidadeCode, diaSemana, horaInicio, horaFim, vigenciaInicio, vigenciaFim, user.id).run();
  await logAudit(env, user, 'create', 'agenda_escala', result.meta.last_row_id, { profissionalId, especialidadeId, equipeId, unidadeCode, diaSemana });
  return json({ id: result.meta.last_row_id }, 201);
}
