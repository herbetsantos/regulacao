import { json, requireAdmin, logAudit } from '../../_utils.js';
import { bumpOuvidoriaVersion, parseActive } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM ouvidoria_regras WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Regra não encontrada.' }, 404);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const titulo = String(body.titulo ?? existing.titulo ?? '').trim();
  const divisao = String(body.divisao ?? existing.divisao ?? '').trim();
  const subtipo = String(body.subtipo ?? existing.subtipo ?? 'geral').trim().toLowerCase();
  const descricao = String(body.descricao ?? existing.descricao ?? '').trim();
  const prioridade = body.hasOwnProperty('prioridade') ? Math.trunc(Number(body.prioridade)) : existing.prioridade;
  const profissionalCodigo = String(body.profissionalCodigo ?? body.profissional_codigo ?? existing.profissional_codigo ?? '').trim();
  const ativo = body.hasOwnProperty('ativo') ? parseActive(body.ativo, true) : existing.ativo;

  if (!titulo || !divisao || !profissionalCodigo) return json({ error: 'Preencha título, divisão e responsável.' }, 400);
  if (!Number.isFinite(prioridade) || prioridade < 1 || prioridade > 9999) return json({ error: 'Prioridade inválida.' }, 400);
  const prof = await env.DB.prepare('SELECT codigo FROM ouvidoria_profissionais WHERE codigo = ?').bind(profissionalCodigo).first();
  if (!prof) return json({ error: 'Profissional não encontrado.' }, 400);

  await env.DB.prepare(
    `UPDATE ouvidoria_regras
        SET titulo = ?, divisao = ?, subtipo = ?, descricao = ?, prioridade = ?,
            profissional_codigo = ?, ativo = ?, updated_at = datetime('now')
      WHERE id = ?`
  ).bind(titulo, divisao, subtipo || 'geral', descricao || null, prioridade, profissionalCodigo, ativo, id).run();

  await bumpOuvidoriaVersion(env);
  await logAudit(env, user, 'update_ouvidoria_regra', 'ouvidoria_regra', id, { titulo, profissionalCodigo, ativo: !!ativo });
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT id, titulo FROM ouvidoria_regras WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Regra não encontrada.' }, 404);
  await env.DB.prepare('DELETE FROM ouvidoria_regras WHERE id = ?').bind(id).run();
  await bumpOuvidoriaVersion(env);
  await logAudit(env, user, 'delete_ouvidoria_regra', 'ouvidoria_regra', id, { titulo: existing.titulo });
  return json({ ok: true });
}
