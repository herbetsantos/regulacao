import { json, requireAdminPanel, getAdminUnidades } from '../../_utils.js';
import { FEATURES, isFeatureKey, getRoleCeiling } from '../../_permissions.js';

const EXTERNAL_KEYS = new Set(['regulacao_vagas', 'producao', 'apoio_clinico']);
const SUPER_ADMIN_MANAGED = new Set(['producao', 'apoio_clinico']);

export async function onRequestGet({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (target.role !== 'user' || !minhas.includes((target.unidade || '').toLowerCase())) {
      return json({ error: 'Você só pode gerenciar usuários das unidades sob sua gestão.' }, 403);
    }
  }

  const ceiling = await getRoleCeiling(env, target.role);
  let results;
  try {
    ({ results } = await env.DB.prepare(
      'SELECT feature_key, enabled FROM user_permissions WHERE user_id = ?'
    ).bind(id).all());
  } catch {
    return json({ error: 'A estrutura de permissões ainda não foi aplicada neste banco.' }, 500);
  }
  const overrides = {};
  results.forEach((r) => { if (isFeatureKey(r.feature_key)) overrides[r.feature_key] = !!r.enabled; });
  EXTERNAL_KEYS.forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(overrides, k)) overrides[k] = false;
  });

  return json({ requester_role: requester.role, role: target.role, features: FEATURES, ceiling, overrides });
}

export async function onRequestPut({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if (target.role === 'super_admin') {
    return json({ error: 'Super Administrador sempre tem acesso completo; não há o que configurar aqui.' }, 400);
  }

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (target.role !== 'user' || !minhas.includes((target.unidade || '').toLowerCase())) {
      return json({ error: 'Você só pode gerenciar usuários das unidades sob sua gestão.' }, 403);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const ceiling = await getRoleCeiling(env, target.role);
  const wanted = body.permissions || {};

  try {
    // Funcionalidades internas: substitui normalmente, preservando ambientes externos.
    await env.DB.prepare(
      "DELETE FROM user_permissions WHERE user_id = ? AND feature_key NOT IN ('regulacao_vagas','producao','apoio_clinico')"
    ).bind(id).run();

    for (const f of FEATURES) {
      if (EXTERNAL_KEYS.has(f.key)) continue;
      if (!ceiling[f.key]) continue;
      const enabled = wanted[f.key] ? 1 : 0;
      await env.DB.prepare(
        'INSERT INTO user_permissions (user_id, feature_key, enabled) VALUES (?, ?, ?)'
      ).bind(id, f.key, enabled).run();
    }

    // Produção e Apoio Clínico são habilitados exclusivamente pelo Super Admin.
    if (requester.role === 'super_admin') {
      for (const key of SUPER_ADMIN_MANAGED) {
        if (!Object.prototype.hasOwnProperty.call(wanted, key)) continue;
        await env.DB.prepare(
          `INSERT INTO user_permissions (user_id, feature_key, enabled)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id, feature_key) DO UPDATE SET enabled=excluded.enabled`
        ).bind(id, key, wanted[key] ? 1 : 0).run();
      }
    }
  } catch {
    return json({ error: 'Não foi possível atualizar as permissões deste usuário.' }, 500);
  }

  return json({ ok: true });
}
