// GET  /api/admin/acessos
// POST /api/admin/acessos body: { user_id, cadastrante, regulador, executor, administrador }
//
// A responsabilidade eMulti é independente do role do Portal. Ao salvar,
// sincronizamos a feature regulacao_vagas em user_permissions apenas para
// que o Portal saiba se deve exibir/abrir o link do eMulti.

import { json, logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import { syncPortalRegulacaoFeature } from '../_permissions.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;

  try {
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.username, u.name, u.role, u.active,
              COALESCE(a.cadastrante, 0) AS cadastrante,
              COALESCE(a.regulador, 0) AS regulador,
              COALESCE(a.executor, 0) AS executor,
              COALESCE(a.administrador, 0) AS administrador,
              e.id AS equipe_id, e.nome AS equipe_nome,
              COALESCE((SELECT COUNT(*) FROM regulacao_user_unidades ru WHERE ru.user_id = u.id AND ru.pode_emitir = 1), 0) AS unidades_emissao
       FROM users u
       LEFT JOIN regulacao_user_acessos a ON a.user_id = u.id
       LEFT JOIN regulacao_equipe_profissionais ep ON ep.user_id = u.id
       LEFT JOIN regulacao_equipes e ON e.id = ep.equipe_id AND e.ativo = 1
       WHERE u.active = 1
       ORDER BY u.name ASC`
    ).all();
    return json({ acessos: results || [] });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('regulacao_user_acessos')) {
      return json({
        error: 'A migração de acessos v2.6 ainda não foi aplicada ao portal-saude-db.',
        codigo: 'MIGRACAO_ACESSOS_PENDENTE',
      }, 503);
    }
    return json({ error: 'Não foi possível carregar os acessos.', detalhe: msg }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const userId = Number(body.user_id);
  if (!userId) return json({ error: 'Informe o usuário.' }, 400);

  const alvo = await env.DB.prepare('SELECT id, username, name, role, active FROM users WHERE id = ?').bind(userId).first();
  if (!alvo || !alvo.active) return json({ error: 'Usuário não encontrado ou inativo.' }, 404);
  if (alvo.role === 'super_admin') {
    return json({ error: 'Super Administrador possui acesso total implícito ao eMulti.' }, 400);
  }

  const cadastrante = body.cadastrante ? 1 : 0;
  const regulador = body.regulador ? 1 : 0;
  const executor = body.executor ? 1 : 0;
  const administrador = body.administrador ? 1 : 0;

  try {
    await env.DB.prepare(
      `INSERT INTO regulacao_user_acessos (user_id, cadastrante, regulador, executor, administrador, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         cadastrante = excluded.cadastrante,
         regulador = excluded.regulador,
         executor = excluded.executor,
         administrador = excluded.administrador,
         updated_at = datetime('now')`
    ).bind(userId, cadastrante, regulador, executor, administrador).run();

    // O link do Portal permanece ativo se houver responsabilidade OU vínculo
    // operacional (equipe/unidade). Remover todas as classes não revoga um
    // acesso que tenha sido concedido pelo administrador por vínculo.
  } catch (err) {
    return json({
      error: 'Não foi possível salvar os acessos. Verifique se o banco do Portal está atualizado em Administração > Diagnóstico.',
      detalhe: String(err?.message || ''),
    }, 503);
  }

  await logAudit(env, user, 'update', 'regulacao_user_acessos', userId, {
    cadastrante: !!cadastrante,
    regulador: !!regulador,
    executor: !!executor,
    administrador: !!administrador,
  });

  const sync = await syncPortalRegulacaoFeature(env, userId);
  return json({ ok: true, acesso_portal: !!sync.enabled, vinculo_equipe: sync.equipe, vinculo_unidade: sync.unidade });
}
