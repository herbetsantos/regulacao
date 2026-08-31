// POST   /api/admin/equipes/:id/unidades   body: { unidade_code }
// DELETE /api/admin/equipes/:id/unidades?unidade_code=xxx

import { json, logAudit } from '../../../_utils.js';
import { requireAdminAccess } from '../../../_shared.js';
import { getUnidadeAtivaComTipo } from '../../../_db.js';

export async function onRequestPost({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const equipeId = Number(params.id);
  const equipe = await env.DB.prepare('SELECT id FROM regulacao_equipes WHERE id = ?').bind(equipeId).first();
  if (!equipe) return json({ error: 'Equipe não encontrada.' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const unidadeCode = (body.unidade_code || '').trim();
  if (!unidadeCode) return json({ error: 'Informe a unidade.' }, 400);

  const { unidade } = await getUnidadeAtivaComTipo(env, unidadeCode);
  if (!unidade) return json({ error: 'Unidade não encontrada.' }, 400);
  if (unidade.tipo !== 'aps') {
    return json({ error: 'Só unidades de Atenção Primária podem ser vinculadas a uma equipe (as demais só emitem guias, por enquanto).' }, 400);
  }

  await env.DB.prepare(
    'INSERT OR IGNORE INTO regulacao_equipe_unidades (equipe_id, unidade_code) VALUES (?, ?)'
  ).bind(equipeId, unidadeCode).run();

  await logAudit(env, user, 'create', 'equipe_unidade', equipeId, { unidadeCode });

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const equipeId = Number(params.id);
  const url = new URL(request.url);
  const unidadeCode = url.searchParams.get('unidade_code');
  if (!unidadeCode) return json({ error: 'Informe unidade_code.' }, 400);

  await env.DB.prepare(
    'DELETE FROM regulacao_equipe_unidades WHERE equipe_id = ? AND unidade_code = ?'
  ).bind(equipeId, unidadeCode).run();

  await logAudit(env, user, 'delete', 'equipe_unidade', equipeId, { unidadeCode });

  return json({ ok: true });
}
