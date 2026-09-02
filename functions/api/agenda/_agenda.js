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
