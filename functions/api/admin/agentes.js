// GET    /api/admin/agentes -> lista todos os vínculos usuário×unidade
// POST   /api/admin/agentes  body: { user_id, unidade_code, pode_emitir, pode_executar }
//        (upsert — cria ou atualiza o vínculo existente)
// DELETE /api/admin/agentes?user_id=xxx&unidade_code=yyy

import { json, logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import { syncPortalRegulacaoFeature } from '../_permissions.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;

  const { results } = await env.DB.prepare(
    `SELECT ru.user_id, us.name AS user_name, ru.unidade_code, u.nome AS unidade_nome,
            ru.pode_emitir, ru.pode_executar
     FROM regulacao_user_unidades ru
     JOIN users us ON us.id = ru.user_id
     JOIN unidades u ON u.code = ru.unidade_code
     ORDER BY us.name, u.nome`
  ).all();

  return json({ agentes: results });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const userId = Number(body.user_id);
  const unidadeCode = (body.unidade_code || '').trim();
  const podeEmitir = body.pode_emitir ? 1 : 0;
  const podeExecutar = body.pode_executar ? 1 : 0;

  if (!userId) return json({ error: 'Informe o usuário.' }, 400);
  if (!unidadeCode) return json({ error: 'Informe a unidade.' }, 400);
  if (!podeEmitir && !podeExecutar) return json({ error: 'Marque ao menos "pode emitir" ou "pode executar".' }, 400);

  const alvo = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND active = 1').bind(userId).first();
  if (!alvo) return json({ error: 'Usuário não encontrado.' }, 400);
  const unidade = await env.DB.prepare('SELECT code FROM unidades WHERE code = ? AND ativo = 1').bind(unidadeCode).first();
  if (!unidade) return json({ error: 'Unidade não encontrada.' }, 400);

  await env.DB.prepare(
    `INSERT INTO regulacao_user_unidades (user_id, unidade_code, pode_emitir, pode_executar)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, unidade_code) DO UPDATE SET pode_emitir = excluded.pode_emitir, pode_executar = excluded.pode_executar`
  ).bind(userId, unidadeCode, podeEmitir, podeExecutar).run();
  await syncPortalRegulacaoFeature(env, userId);

  await logAudit(env, user, 'upsert', 'agente_operacional', userId, { unidadeCode, podeEmitir, podeExecutar });

  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const userId = Number(url.searchParams.get('user_id'));
  const unidadeCode = url.searchParams.get('unidade_code');
  if (!userId || !unidadeCode) return json({ error: 'Informe user_id e unidade_code.' }, 400);

  await env.DB.prepare(
    'DELETE FROM regulacao_user_unidades WHERE user_id = ? AND unidade_code = ?'
  ).bind(userId, unidadeCode).run();
  await syncPortalRegulacaoFeature(env, userId);

  await logAudit(env, user, 'delete', 'agente_operacional', userId, { unidadeCode });

  return json({ ok: true });
}
