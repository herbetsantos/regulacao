import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess, isEquipeMember } from '../../_shared.js';
import { principalId } from '../../_hybrid.js';
import { getProfissionalAssistencialPorPrincipal } from '../../_professionals.js';
import {
  canOrganizeAssistentialProfessional,
  validDate,
  validTime,
} from '../_agenda.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.executor && !access.administrador) {
    return json({ error: 'Sem acesso à escala.' }, 403);
  }

  const url = new URL(request.url);
  let profissionalId = String(url.searchParams.get('profissional_id') || '').trim();

  if (access.executor && !access.organizador && !access.administrador) {
    const own = await getProfissionalAssistencialPorPrincipal(env, user);
    if (!own) return json({ escalas: [] });
    profissionalId = own.id;
  }

  if (!profissionalId) return json({ escalas: [] });

  if (!access.administrador) {
    const prof = await env.DB_REGULACAO.prepare(
      'SELECT equipe_id FROM regulacao_profissionais WHERE id=? AND ativo=1'
    ).bind(profissionalId).first();
    if (!prof) return json({ error: 'Profissional não encontrado.' }, 404);
    const membro = await isEquipeMember(env, user, Number(prof.equipe_id), access);
    if (!membro) return json({ error: 'Profissional fora da sua equipe.' }, 403);
  }

  const { results } = await env.DB_REGULACAO.prepare(`
    SELECT ae.*, e.nome AS especialidade_nome, p.nome AS profissional_nome
    FROM agenda_escalas ae
    JOIN especialidades e ON e.id = ae.especialidade_id
    LEFT JOIN regulacao_profissionais p ON p.id=ae.profissional_id
    WHERE ae.profissional_id = ? AND ae.ativo = 1
    ORDER BY ae.dia_semana, ae.hora_inicio
  `).bind(profissionalId).all();

  return json({ escalas: results || [] });
}

export async function onRequestPost({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.administrador) {
    return json({ error: 'A configuração das escalas é exclusiva do Administrador.' }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const profissionalId = String(body.profissional_id || '').trim();
  const especialidadeId = Number(body.especialidade_id);
  const equipeId = Number(body.equipe_id);
  const unidadeCode = String(body.unidade_code || '').trim();
  const diaSemana = Number(body.dia_semana);
  const horaInicio = String(body.hora_inicio || '');
  const horaFim = String(body.hora_fim || '');

  if (
    !profissionalId || !especialidadeId || !equipeId || !unidadeCode ||
    diaSemana < 1 || diaSemana > 7 ||
    !validTime(horaInicio) || !validTime(horaFim) || horaInicio >= horaFim
  ) {
    return json({ error: 'Preencha profissional, especialidade, equipe, unidade, dia e intervalo válido.' }, 400);
  }

  const chk = await canOrganizeAssistentialProfessional(
    env, user, access, equipeId, profissionalId, especialidadeId, unidadeCode
  );
  if (chk.error) return chk.error;

  const vigenciaInicio = body.vigencia_inicio ? String(body.vigencia_inicio) : null;
  const vigenciaFim = body.vigencia_fim ? String(body.vigencia_fim) : null;
  if (
    (vigenciaInicio && !validDate(vigenciaInicio)) ||
    (vigenciaFim && !validDate(vigenciaFim)) ||
    (vigenciaInicio && vigenciaFim && vigenciaFim < vigenciaInicio)
  ) {
    return json({ error: 'Vigência inválida.' }, 400);
  }

  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_escalas (
      profissional_user_id, profissional_id, especialidade_id, equipe_id,
      unidade_code, dia_semana, hora_inicio, hora_fim,
      vigencia_inicio, vigencia_fim, created_by
    )
    VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    profissionalId, especialidadeId, equipeId, unidadeCode, diaSemana,
    horaInicio, horaFim, vigenciaInicio, vigenciaFim, user.id
  ).run();

  await logAudit(env, user, 'create', 'agenda_escala', result.meta.last_row_id, {
    profissionalId, especialidadeId, equipeId, unidadeCode, diaSemana
  });

  return json({ id: result.meta.last_row_id }, 201);
}
