import { json, requireAdminPanel, requireSuperAdmin, logAudit } from './_utils.js';
import { FEATURES, isFeatureKey } from './_permissions.js';

// super_admin não entra nessa lista: sempre tem tudo liberado e não é editável.
const ROLES = ['user', 'admin_unidade', 'admin'];
const ROLE_SET = new Set(ROLES);
const ROLE_FEATURES = FEATURES.filter((f) => f.key !== 'regulacao_vagas');

// GET: qualquer papel do painel admin pode ver o teto vigente (é usado para
// desenhar o card de Configurações do profissional). Só o Super Admin edita.
export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminPanel(request, env);
  if (error) return error;

  let results;
  try {
    ({ results } = await env.DB.prepare('SELECT role, feature_key, enabled FROM role_permissions').all());
  } catch {
    return json({ error: 'A migração database/migrations/legacy/migration_permissions.sql ainda não foi executada neste banco.' }, 500);
  }

  const map = {};
  ROLES.forEach((r) => {
    map[r] = {};
    ROLE_FEATURES.forEach((f) => { map[r][f.key] = false; });
  });
  results.forEach((row) => {
    if (ROLE_SET.has(row.role) && isFeatureKey(row.feature_key)) {
      map[row.role][row.feature_key] = !!row.enabled;
    }
  });

  return json({ features: ROLE_FEATURES, roles: ROLES, permissions: map });
}

// PUT: substitui o teto de todos os papéis de uma vez.
// body: { permissions: { user: { receituario: true, ... }, admin_unidade: {...}, admin: {...} } }
export async function onRequestPut({ request, env }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const permissions = body.permissions || {};

  try {
    for (const role of ROLES) {
      const featMap = permissions[role] || {};
      for (const f of ROLE_FEATURES) {
        const enabled = featMap[f.key] ? 1 : 0;
        await env.DB.prepare(
          `INSERT INTO role_permissions (role, feature_key, enabled) VALUES (?, ?, ?)
           ON CONFLICT (role, feature_key) DO UPDATE SET enabled = excluded.enabled`
        ).bind(role, f.key, enabled).run();
      }
    }
  } catch {
    return json({ error: 'A migração database/migrations/legacy/migration_permissions.sql ainda não foi executada neste banco.' }, 500);
  }

  await logAudit(env, user, 'update_role_permissions', 'role_permissions', null, permissions);

  return json({ ok: true });
}
