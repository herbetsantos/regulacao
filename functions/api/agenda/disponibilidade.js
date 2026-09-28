import { json } from '../_utils.js';
import { requireRegulacaoAccess } from '../_shared.js';
import {
  canOrganizeAssistentialProfessional,
  defaultDuration,
  validDate,
  validTime,
  timeToMinutes,
  dateWeekday,
  ensureProfessionalAvailable,
} from './_agenda.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.administrador && !access.gestor) {
    return json({ error: 'Apenas Organizador, Gestor ou Administrador pode consultar horários disponíveis.' }, 403);
  }

  const url = new URL(request.url);
  const profissionalId = String(url.searchParams.get('profissional_id') || '').trim();
  const especialidadeId = Number(url.searchParams.get('especialidade_id') || 0);
  const equipeId = Number(url.searchParams.get('equipe_id') || 0);
  const unidadeCode = String(url.searchParams.get('unidade_code') || '').trim();
  const data = String(url.searchParams.get('data') || '');

  if (!profissionalId || !especialidadeId || !equipeId || !unidadeCode || !validDate(data)) {
    return json({ error: 'Profissional, especialidade, equipe, unidade e data são obrigatórios.' }, 400);
  }

  const chk = await canOrganizeAssistentialProfessional(
    env, user, access, equipeId, profissionalId, especialidadeId, unidadeCode
  );
  if (chk.error) return chk.error;

  const dow = dateWeekday(data);
  if (!dow) return json({ error: 'Data inválida.' }, 400);

  let escalas = [];
  try {
    const { results } = await env.DB_REGULACAO.prepare(`
      SELECT hora_inicio,hora_fim,
             COALESCE(intervalo_entre_atendimentos_min,0) AS intervalo_entre_atendimentos_min,
             almoco_inicio,almoco_fim
      FROM agenda_escalas
      WHERE profissional_id=?
        AND especialidade_id=?
        AND equipe_id=?
        AND unidade_code=?
        AND dia_semana=?
        AND ativo=1
        AND (vigencia_inicio IS NULL OR vigencia_inicio<=?)
        AND (vigencia_fim IS NULL OR vigencia_fim>=?)
      ORDER BY hora_inicio
    `).bind(
      profissionalId, especialidadeId, equipeId, unidadeCode, dow, data, data
    ).all();
    escalas = results || [];
  } catch {
    const { results } = await env.DB_REGULACAO.prepare(`
      SELECT hora_inicio,hora_fim
      FROM agenda_escalas
      WHERE profissional_id=?
        AND especialidade_id=?
        AND equipe_id=?
        AND unidade_code=?
        AND dia_semana=?
        AND ativo=1
        AND (vigencia_inicio IS NULL OR vigencia_inicio<=?)
        AND (vigencia_fim IS NULL OR vigencia_fim>=?)
      ORDER BY hora_inicio
    `).bind(
      profissionalId, especialidadeId, equipeId, unidadeCode, dow, data, data
    ).all();
    escalas = (results || []).map((s) => ({
      ...s,
      intervalo_entre_atendimentos_min: 0,
      almoco_inicio: null,
      almoco_fim: null,
    }));
  }

  const duracaoMinutos = await defaultDuration(env, especialidadeId);
  const slots = [];
  const seen = new Set();

  for (const escala of escalas) {
    const inicio = timeToMinutes(escala.hora_inicio);
    const fim = timeToMinutes(escala.hora_fim);
    const intervalo = Math.max(0, Number(escala.intervalo_entre_atendimentos_min || 0));
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio >= fim) continue;

    const almocoInicio = escala.almoco_inicio ? timeToMinutes(escala.almoco_inicio) : null;
    const almocoFim = escala.almoco_fim ? timeToMinutes(escala.almoco_fim) : null;
    const passo = duracaoMinutos + intervalo;

    for (let minuto = inicio; minuto + duracaoMinutos <= fim; minuto += passo) {
      const termino = minuto + duracaoMinutos;
      if (almocoInicio != null && almocoFim != null && minuto < almocoFim && termino > almocoInicio) continue;

      const hora = `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`;
      if (seen.has(hora)) continue;

      const available = await ensureProfessionalAvailable(
        env,
        profissionalId,
        data,
        hora,
        duracaoMinutos,
        null,
        intervalo
      );
      if (!available.error) {
        seen.add(hora);
        slots.push({ hora_inicio: hora, duracao_minutos: duracaoMinutos });
      }
    }
  }

  return json({
    data,
    profissional_id: profissionalId,
    duracao_minutos: duracaoMinutos,
    slots,
  });
}
