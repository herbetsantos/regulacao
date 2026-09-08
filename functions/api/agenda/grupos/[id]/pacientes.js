import { json, logAudit } from '../../../_utils.js';
import { requireRegulacaoAccess, isEquipeMember } from '../../../_shared.js';
import { principalId } from '../../../_hybrid.js';

async function loadGrupo(env, id) {
  return env.DB_REGULACAO.prepare(
    'SELECT * FROM agenda_grupos WHERE id=? AND ativo=1'
  ).bind(Number(id)).first();
}

async function executorVinculadoAoGrupo(env, grupoId, user) {
  return env.DB_REGULACAO.prepare(`
    SELECT 1 ok
    FROM agenda_grupo_profissionais agp
    JOIN regulacao_profissionais rp ON rp.id=agp.profissional_id
    WHERE agp.grupo_id=? AND rp.principal_id=?
    LIMIT 1
  `).bind(Number(grupoId), principalId(user)).first();
}

export async function onRequestPost({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.administrador) {
    return json({ error: 'Apenas Organizador ou Administrador pode incluir paciente em grupo.' }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const grupoId = Number(params.id);
  const guiaId = Number(body.guia_id);
  const grupo = await loadGrupo(env, grupoId);
  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);

  if (!access.administrador) {
    const membro = await isEquipeMember(env, user, Number(grupo.equipe_id), access);
    if (!membro) return json({ error: 'Grupo fora da sua equipe.' }, 403);
  }

  const guia = await env.DB_REGULACAO.prepare(
    'SELECT * FROM guias WHERE id=?'
  ).bind(guiaId).first();

  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);
  if (guia.situacao !== 'lista_espera') {
    return json({ error: 'Somente pacientes em Lista de espera podem ser incluídos em grupo.' }, 409);
  }
  if (Number(guia.especialidade_id) !== Number(grupo.especialidade_id)) {
    return json({ error: 'A especialidade da guia é diferente da especialidade do grupo.' }, 409);
  }
  if (guia.equipe_id != null && Number(guia.equipe_id) !== Number(grupo.equipe_id)) {
    return json({ error: 'A guia está sob responsabilidade de outra equipe. Transfira-a antes na Regulação.' }, 409);
  }

  const ocupacao = await env.DB_REGULACAO.prepare(`
    SELECT COUNT(*) AS c
    FROM agenda_grupo_pacientes
    WHERE grupo_id=? AND status='ativo'
  `).bind(grupoId).first();

  if (Number(ocupacao?.c || 0) >= Number(grupo.capacidade)) {
    return json({ error: 'O grupo atingiu sua capacidade.' }, 409);
  }

  const outraAlocacao = await env.DB_REGULACAO.prepare(`
    SELECT gp.grupo_id
    FROM agenda_grupo_pacientes gp
    JOIN agenda_grupos ag ON ag.id=gp.grupo_id AND ag.ativo=1
    WHERE gp.guia_id=? AND gp.status='ativo' AND gp.grupo_id<>?
    LIMIT 1
  `).bind(guiaId, grupoId).first();
  if (outraAlocacao) {
    return json({ error: 'Esta guia já está ativa em outro grupo.' }, 409);
  }

  await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_grupo_pacientes(grupo_id,guia_id,status,added_by)
    VALUES(?,?,'ativo',?)
    ON CONFLICT(grupo_id,guia_id) DO UPDATE SET
      status='ativo',
      entrada_em=datetime('now'),
      saida_em=NULL,
      motivo_saida=NULL,
      added_by=excluded.added_by
  `).bind(grupoId, guiaId, user.id).run();

  await env.DB_REGULACAO.prepare(`
    UPDATE guias
    SET situacao='em_atendimento',
        equipe_id=?,
        unidade_executante_code=?,
        desfecho_atendimento=NULL,
        updated_at=datetime('now')
    WHERE id=?
  `).bind(grupo.equipe_id, grupo.unidade_code, guiaId).run();

  await logAudit(env, user, 'create', 'grupo_paciente', guiaId, { grupoId });
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const grupoId = Number(params.id);
  const guiaId = Number(body.guia_id);
  const desfecho = String(body.desfecho || 'removido');

  if (!['concluido', 'abandono', 'removido'].includes(desfecho)) {
    return json({ error: 'Desfecho inválido.' }, 400);
  }

  const grupo = await loadGrupo(env, grupoId);
  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);

  if (desfecho === 'removido') {
    if (!access.organizador && !access.administrador) {
      return json({ error: 'Apenas Organizador ou Administrador pode retirar paciente e devolvê-lo à fila.' }, 403);
    }
    if (!access.administrador) {
      const membro = await isEquipeMember(env, user, Number(grupo.equipe_id), access);
      if (!membro) return json({ error: 'Grupo fora da sua equipe.' }, 403);
    }
  } else {
    if (!access.executor && !access.administrador) {
      return json({ error: 'Apenas Executor ou Administrador pode registrar conclusão ou abandono.' }, 403);
    }
    if (!access.administrador) {
      const vinc = await executorVinculadoAoGrupo(env, grupoId, user);
      if (!vinc) return json({ error: 'Você não está vinculado à execução deste grupo.' }, 403);
    }
  }

  await env.DB_REGULACAO.prepare(`
    UPDATE agenda_grupo_pacientes
    SET status=?,saida_em=datetime('now'),motivo_saida=?
    WHERE grupo_id=? AND guia_id=?
  `).bind(
    desfecho,
    String(body.motivo || '').trim() || null,
    grupoId,
    guiaId
  ).run();

  if (desfecho === 'removido') {
    await env.DB_REGULACAO.prepare(`
      UPDATE guias
      SET situacao='lista_espera',desfecho_atendimento=NULL,updated_at=datetime('now')
      WHERE id=?
    `).bind(guiaId).run();
  } else {
    await env.DB_REGULACAO.prepare(`
      UPDATE guias
      SET situacao='concluido',desfecho_atendimento=?,updated_at=datetime('now')
      WHERE id=?
    `).bind(desfecho, guiaId).run();
  }

  await logAudit(env, user, 'update', 'grupo_paciente', guiaId, { grupoId, desfecho });
  return json({ ok: true });
}
