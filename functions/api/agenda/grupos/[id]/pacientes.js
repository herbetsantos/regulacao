import { json, logAudit } from '../../../_utils.js';
import { requireRegulacaoAccess } from '../../../_shared.js';

export async function onRequestPost({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.executor && !access.administrador && !access.regulador) return json({ error: 'Sem permissão para alocar paciente.' }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const grupoId = Number(params.id), guiaId = Number(body.guia_id);
  const grupo = await env.DB_REGULACAO.prepare('SELECT * FROM agenda_grupos WHERE id = ? AND ativo = 1').bind(grupoId).first();
  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);
  if (!access.administrador && !access.regulador && Number(grupo.profissional_user_id) !== Number(user.id)) return json({ error: 'Sem acesso ao grupo.' }, 403);
  const guia = await env.DB_REGULACAO.prepare('SELECT * FROM guias WHERE id = ?').bind(guiaId).first();
  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);
  if (Number(guia.especialidade_id) !== Number(grupo.especialidade_id)) return json({ error: 'A especialidade da guia é diferente da especialidade do grupo.' }, 409);
  if (!['lista_espera', 'em_atendimento'].includes(guia.situacao)) return json({ error: 'Somente pacientes em lista de espera podem ser alocados.' }, 409);
  const ocupacao = await env.DB_REGULACAO.prepare("SELECT COUNT(*) AS c FROM agenda_grupo_pacientes WHERE grupo_id = ? AND status = 'ativo'").bind(grupoId).first();
  if (Number(ocupacao?.c || 0) >= Number(grupo.capacidade)) return json({ error: 'O grupo atingiu sua capacidade.' }, 409);
  await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_grupo_pacientes (grupo_id, guia_id, status, added_by) VALUES (?, ?, 'ativo', ?)
    ON CONFLICT(grupo_id, guia_id) DO UPDATE SET status='ativo', entrada_em=datetime('now'), saida_em=NULL, motivo_saida=NULL, added_by=excluded.added_by
  `).bind(grupoId, guiaId, user.id).run();
  await env.DB_REGULACAO.prepare("UPDATE guias SET situacao='em_atendimento', desfecho_atendimento=NULL, updated_at=datetime('now') WHERE id = ?").bind(guiaId).run();
  await logAudit(env, user, 'create', 'grupo_paciente', guiaId, { grupoId });
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const grupoId = Number(params.id), guiaId = Number(body.guia_id), desfecho = String(body.desfecho || 'removido');
  if (!['concluido', 'abandono', 'removido'].includes(desfecho)) return json({ error: 'Desfecho inválido.' }, 400);
  const grupo = await env.DB_REGULACAO.prepare('SELECT * FROM agenda_grupos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);
  if (!access.administrador && !access.regulador && Number(grupo.profissional_user_id) !== Number(user.id)) return json({ error: 'Sem acesso ao grupo.' }, 403);
  await env.DB_REGULACAO.prepare("UPDATE agenda_grupo_pacientes SET status=?, saida_em=datetime('now'), motivo_saida=? WHERE grupo_id=? AND guia_id=?")
    .bind(desfecho, String(body.motivo || '').trim() || null, grupoId, guiaId).run();
  if (desfecho === 'removido') {
    await env.DB_REGULACAO.prepare("UPDATE guias SET situacao='lista_espera', desfecho_atendimento=NULL, updated_at=datetime('now') WHERE id=?").bind(guiaId).run();
  } else {
    await env.DB_REGULACAO.prepare("UPDATE guias SET situacao='concluido', desfecho_atendimento=?, updated_at=datetime('now') WHERE id=?").bind(desfecho, guiaId).run();
  }
  await logAudit(env, user, 'update', 'grupo_paciente', guiaId, { grupoId, desfecho });
  return json({ ok: true });
}
