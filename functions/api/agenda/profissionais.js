import { json } from '../_utils.js';
import { requireRegulacaoAccess, isEquipeMember, getUserEquipeIds } from '../_shared.js';
import { principalId } from '../_hybrid.js';
import { listProfissionaisAssistenciais } from '../_professionals.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.executor && !access.gestor && !access.administrador) {
    return json({ error: 'Apenas Organizador, Executor, Gestor ou Administrador pode consultar profissionais da agenda.' }, 403);
  }

  const url = new URL(request.url);
  let equipeId = Number(url.searchParams.get('equipe_id') || 0) || null;
  const unidadeCode = String(url.searchParams.get('unidade_code') || '').trim() || null;
  const especialidadeId = Number(url.searchParams.get('especialidade_id') || 0) || null;

  let onlyPrincipal = null;

  if (!access.administrador && !access.gestor) {
    if (!equipeId && access.organizador) {
      const equipes = await getUserEquipeIds(env, user);
      equipeId = equipes[0] || null;
    }
    if (equipeId) {
      const membro = await isEquipeMember(env, user, equipeId, access);
      if (!membro) return json({ error: 'Equipe fora do seu escopo.' }, 403);
    }
    if (access.executor && !access.organizador) {
      onlyPrincipal = principalId(user);
    }
  }

  const profissionais = await listProfissionaisAssistenciais(env, {
    equipeId,
    unidadeCode,
    especialidadeId,
    principalId: onlyPrincipal,
  });

  return json({ profissionais });
}
