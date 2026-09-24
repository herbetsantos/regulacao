import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess, isEquipeMember, getUserEquipeIds } from '../../_shared.js';
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
  if (!access.organizador && !access.executor && !(access.gestor || access.administrador)) {
    return json({ error: 'Sem acesso à escala.' }, 403);
  }

  const url = new URL(request.url);
  let profissionalId = String(url.searchParams.get('profissional_id') || '').trim();

  if (access.executor && !access.organizador && !(access.gestor || access.administrador)) {
    const own = await getProfissionalAssistencialPorPrincipal(env, user);
    if (!own) return json({ escalas: [] });
    profissionalId = own.id;
  }

  if (!profissionalId) return json({ escalas: [] });

  if (!(access.gestor || access.administrador)) {
    const equipeIds=await getUserEquipeIds(env,user);
    if(!equipeIds.length)return json({ error: 'Você não possui equipe vinculada.' }, 403);
    const ph=equipeIds.map(()=>'?').join(',');
    const prof = await env.DB_REGULACAO.prepare(
      `SELECT 1 ok FROM regulacao_profissionais p JOIN regulacao_profissional_equipes pe ON pe.profissional_id=p.id WHERE p.id=? AND p.ativo=1 AND pe.equipe_id IN (${ph}) LIMIT 1`
    ).bind(profissionalId,...equipeIds).first();
    if (!prof) return json({ error: 'Profissional fora das suas equipes.' }, 403);
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
  if (!(access.gestor || access.administrador)) {
    return json({ error: 'A configuração das escalas é exclusiva do Gestor ou Administrador.' }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const profissionalId = String(body.profissional_id || '').trim();
  const especialidadeId = Number(body.especialidade_id);
  const equipeId = Number(body.equipe_id);
  const unidadeCode = String(body.unidade_code || '').trim();
  const diasSemana = Array.isArray(body.dias_semana)
    ? [...new Set(body.dias_semana.map(Number).filter((d) => d >= 1 && d <= 7))].sort((a,b) => a-b)
    : [Number(body.dia_semana)].filter((d) => d >= 1 && d <= 7);
  const horaInicio = String(body.hora_inicio || '');
  const horaFim = String(body.hora_fim || '');
  const intervaloEntreAtendimentosMin = Math.max(0, Math.min(180, Number(body.intervalo_entre_atendimentos_min || 0)));
  const almocoInicio = body.almoco_inicio ? String(body.almoco_inicio) : null;
  const almocoFim = body.almoco_fim ? String(body.almoco_fim) : null;

  if (
    !profissionalId || !especialidadeId || !equipeId || !unidadeCode ||
    !diasSemana.length ||
    !validTime(horaInicio) || !validTime(horaFim) || horaInicio >= horaFim
  ) {
    return json({ error: 'Preencha profissional, especialidade, equipe, unidade, ao menos um dia e intervalo válido.' }, 400);
  }

  if ((almocoInicio && !almocoFim) || (!almocoInicio && almocoFim)) {
    return json({ error: 'Informe início e fim do horário de almoço, ou deixe ambos vazios.' }, 400);
  }
  if (almocoInicio && (
    !validTime(almocoInicio) || !validTime(almocoFim) ||
    almocoInicio >= almocoFim ||
    almocoInicio < horaInicio || almocoFim > horaFim
  )) {
    return json({ error: 'O horário de almoço deve estar integralmente dentro do período de trabalho.' }, 400);
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

  const statements = diasSemana.map((diaSemana) =>
    env.DB_REGULACAO.prepare(`
      INSERT INTO agenda_escalas (
        profissional_user_id, profissional_id, especialidade_id, equipe_id,
        unidade_code, dia_semana, hora_inicio, hora_fim,
        intervalo_entre_atendimentos_min, almoco_inicio, almoco_fim,
        vigencia_inicio, vigencia_fim, created_by
      )
      VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      profissionalId, especialidadeId, equipeId, unidadeCode, diaSemana,
      horaInicio, horaFim, intervaloEntreAtendimentosMin, almocoInicio, almocoFim,
      vigenciaInicio, vigenciaFim, user.id
    )
  );

  const results = await env.DB_REGULACAO.batch(statements);
  const ids = results.map((result) => result?.meta?.last_row_id).filter(Boolean);

  for (let i = 0; i < diasSemana.length; i++) {
    await logAudit(env, user, 'create', 'agenda_escala', ids[i] || null, {
      profissionalId, especialidadeId, equipeId, unidadeCode, diaSemana:diasSemana[i],
      intervaloEntreAtendimentosMin, almocoInicio, almocoFim,
      cadastro_em_lote:diasSemana.length > 1
    });
  }

  return json({
    ids,
    dias_semana:diasSemana,
    criadas:diasSemana.length,
  }, 201);
}
