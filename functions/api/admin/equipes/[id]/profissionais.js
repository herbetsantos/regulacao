// Profissional pertence a no máximo UMA equipe eMulti.
// POST body: { user_id, cargo, especialidade_ids[] }
// PUT  body: { user_id, cargo, especialidade_ids[] }
// DELETE ?user_id=...

import { json, logAudit } from '../../../_utils.js';
import { requireAdminAccess } from '../../../_shared.js';
import { ensureProfissionalSchema, setProfissionalEspecialidades } from '../../../_professionals.js';
import { syncPortalRegulacaoFeature } from '../../../_permissions.js';

async function salvar({ request, env, params, atualizar = false }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;
  await ensureProfissionalSchema(env);

  const equipeId = Number(params.id);
  const equipe = await env.DB.prepare('SELECT id, nome FROM regulacao_equipes WHERE id = ? AND ativo = 1').bind(equipeId).first();
  if (!equipe) return json({ error: 'Equipe não encontrada ou inativa.' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const userId = Number(body.user_id);
  const cargo = String(body.cargo || '').trim();
  const especialidadeIds = Array.isArray(body.especialidade_ids) ? body.especialidade_ids.map(Number).filter(Boolean) : [];
  if (!userId) return json({ error: 'Informe o profissional.' }, 400);
  if (!cargo) return json({ error: 'Cargo/profissão do profissional é obrigatório.' }, 400);
  if (especialidadeIds.length === 0) return json({ error: 'Informe ao menos uma especialidade atendida pelo profissional.' }, 400);

  const profissional = await env.DB.prepare('SELECT id, name FROM users WHERE id = ? AND active = 1').bind(userId).first();
  if (!profissional) return json({ error: 'Usuário não encontrado.' }, 400);

  const vinculoAtual = await env.DB.prepare(`
    SELECT ep.equipe_id, e.nome AS equipe_nome FROM regulacao_equipe_profissionais ep
    JOIN regulacao_equipes e ON e.id = ep.equipe_id WHERE ep.user_id = ? LIMIT 1
  `).bind(userId).first();
  if (vinculoAtual && Number(vinculoAtual.equipe_id) !== equipeId) {
    return json({ error: `${profissional.name} já está vinculado à equipe ${vinculoAtual.equipe_nome}. Remova o vínculo atual antes de vincular a outra equipe.` }, 409);
  }

  await env.DB.prepare(`INSERT INTO regulacao_equipe_profissionais (equipe_id, user_id, cargo)
    VALUES (?, ?, ?) ON CONFLICT(equipe_id, user_id) DO UPDATE SET cargo = excluded.cargo`
  ).bind(equipeId, userId, cargo).run();
  await setProfissionalEspecialidades(env, userId, especialidadeIds);
  await syncPortalRegulacaoFeature(env, userId);
  await logAudit(env, user, atualizar ? 'update' : 'create', 'equipe_profissional', equipeId, { userId, cargo, especialidadeIds });
  return json({ ok: true });
}

export async function onRequestPost(ctx) { return salvar({ ...ctx, atualizar:false }); }
export async function onRequestPut(ctx) { return salvar({ ...ctx, atualizar:true }); }

export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;
  await ensureProfissionalSchema(env);
  const equipeId = Number(params.id);
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get('user_id'));
  if (!userId) return json({ error: 'Informe user_id.' }, 400);
  await env.DB.prepare('DELETE FROM regulacao_profissional_especialidades WHERE user_id = ?').bind(userId).run();
  await env.DB.prepare('DELETE FROM regulacao_equipe_profissionais WHERE equipe_id = ? AND user_id = ?').bind(equipeId, userId).run();
  await syncPortalRegulacaoFeature(env, userId);
  await logAudit(env, user, 'delete', 'equipe_profissional', equipeId, { userId });
  return json({ ok: true });
}
