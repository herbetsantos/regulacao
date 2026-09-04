import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess } from '../../_shared.js';

export async function onRequestDelete({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  const id = Number(params.id);
  const row = await env.DB_REGULACAO.prepare('SELECT * FROM agenda_escalas WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'Escala não encontrada.' }, 404);
  if (!access.administrador) return json({ error: 'A configuração das escalas é exclusiva do Administrador.' }, 403);
  await env.DB_REGULACAO.prepare("UPDATE agenda_escalas SET ativo = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  await logAudit(env, user, 'delete', 'agenda_escala', id, {});
  return json({ ok: true });
}
