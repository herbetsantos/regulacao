import { json } from '../_utils.js';
import { getProfissionalNaEquipe } from '../_professionals.js';
import { getEquipeInfo } from '../_shared.js';

export function validDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')); }
export function validTime(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')); }

export async function canManageProfessional(env, user, access, equipeId, profissionalId, especialidadeId, unidadeCode) {
  if (!access.administrador && Number(profissionalId) !== Number(user.id)) {
    return { error: json({ error: 'Você só pode gerenciar a própria agenda.' }, 403) };
  }
  const prof = await getProfissionalNaEquipe(env, Number(equipeId), Number(profissionalId));
  if (!prof) return { error: json({ error: 'Profissional não pertence à equipe informada.' }, 400) };
  if (especialidadeId && !(prof.especialidade_ids || []).includes(Number(especialidadeId))) {
    return { error: json({ error: 'Especialidade não vinculada a este profissional.' }, 400) };
  }
  const equipe = await getEquipeInfo(env, Number(equipeId));
  if (!equipe || !equipe.unidades.some((u) => u.code === unidadeCode)) {
    return { error: json({ error: 'Unidade não pertence à cobertura da equipe.' }, 400) };
  }
  return { prof, equipe };
}

export async function defaultDuration(env, especialidadeId) {
  const row = await env.DB_REGULACAO.prepare(
    'SELECT duracao_padrao_min FROM especialidades WHERE id = ?'
  ).bind(Number(especialidadeId)).first();
  return Number(row?.duracao_padrao_min || 30);
}


// --- Agenda baseada no profissional assistencial (2.20.0) ---------------------
import { profissionalCompativelComVinculo } from '../_professionals.js';
import { isEquipeMember } from '../_shared.js';

export function timeToMinutes(v) {
  const m = String(v || '').match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

export function dateWeekday(v) {
  const d = new Date(`${v}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

export async function canOrganizeAssistentialProfessional(
  env, user, access, equipeId, profissionalId, especialidadeId, unidadeCode
) {
  if (!access.administrador && !access.organizador && !access.gestor) {
    return { error: json({ error: 'Apenas Organizador, Gestor ou Administrador pode definir agenda e profissionais.' }, 403) };
  }
  if (!access.administrador && !access.gestor) {
    const membro = await isEquipeMember(env, user, Number(equipeId), access);
    if (!membro) return { error: json({ error: 'Você só pode organizar a agenda da sua própria equipe.' }, 403) };
  }
  const prof = await profissionalCompativelComVinculo(
    env, String(profissionalId), Number(equipeId), Number(especialidadeId), String(unidadeCode)
  );
  if (!prof) {
    return { error: json({ error: 'Profissional não possui vínculo ativo com esta equipe, unidade e especialidade.' }, 400) };
  }
  return { prof };
}

export async function ensureWithinScale(
  env, profissionalId, especialidadeId, equipeId, unidadeCode, data, horaInicio, duracaoMinutos
) {
  const dow = dateWeekday(data);
  if (!dow) return { error: json({ error: 'Data inválida.' }, 400) };
  const start = timeToMinutes(horaInicio);
  const end = start + Number(duracaoMinutos || 0);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { error: json({ error: 'Horário inválido.' }, 400) };
  }

  const { results } = await env.DB_REGULACAO.prepare(`
    SELECT hora_inicio,hora_fim,vigencia_inicio,vigencia_fim
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
    String(profissionalId), Number(especialidadeId), Number(equipeId),
    String(unidadeCode), dow, String(data), String(data)
  ).all();

  const fits = (results || []).some((s) => {
    const a = timeToMinutes(s.hora_inicio);
    const b = timeToMinutes(s.hora_fim);
    return start >= a && end <= b;
  });

  if (!fits) {
    return { error: json({
      error: 'O horário escolhido não está contido na escala ativa do profissional para esta unidade e especialidade.'
    }, 409) };
  }
  return { ok: true };
}

export async function ensureProfessionalAvailable(
  env, profissionalId, data, horaInicio, duracaoMinutos, ignoreGrupoId = null
) {
  const start = timeToMinutes(horaInicio);
  const end = start + Number(duracaoMinutos || 0);

  const [ind, grp] = await Promise.all([
    env.DB_REGULACAO.prepare(`
      SELECT hora_inicio,duracao_minutos
      FROM agenda_individuais
      WHERE profissional_id=?
        AND data_atendimento=?
        AND situacao<>'cancelado'
    `).bind(String(profissionalId), String(data)).all(),
    env.DB_REGULACAO.prepare(`
      SELECT ge.grupo_id,ge.hora_inicio,ge.duracao_minutos
      FROM agenda_grupo_encontros ge
      JOIN agenda_grupo_profissionais gp ON gp.grupo_id=ge.grupo_id
      WHERE gp.profissional_id=?
        AND ge.data_encontro=?
        AND ge.situacao<>'cancelado'
    `).bind(String(profissionalId), String(data)).all(),
  ]);

  const overlap = (s, d) => {
    const a = timeToMinutes(s);
    const b = a + Number(d || 0);
    return start < b && end > a;
  };

  if ((ind.results || []).some((x) => overlap(x.hora_inicio, x.duracao_minutos))) {
    return { error: json({ error: 'O profissional já possui atendimento individual nesse intervalo.' }, 409) };
  }

  const groupConflict = (grp.results || []).some((x) =>
    (ignoreGrupoId == null || Number(x.grupo_id) !== Number(ignoreGrupoId))
    && overlap(x.hora_inicio, x.duracao_minutos)
  );
  if (groupConflict) {
    return { error: json({ error: 'O profissional já participa de outro grupo nesse intervalo.' }, 409) };
  }

  return { ok: true };
}
