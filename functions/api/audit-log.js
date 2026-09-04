import { json, requireSuperAdmin } from './_utils.js';

// GET /api/audit-log?limit=100&offset=0
// Só o Super Administrador pode ver a trilha de auditoria completa.
export async function onRequestGet({ request, env }) {
  const { error } = await requireSuperAdmin(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
  const offset = Number(url.searchParams.get('offset')) || 0;

  let results;
  try {
    ({ results } = await env.DB.prepare(
      `SELECT id, actor_user_id, actor_username, action, entity_type, entity_id, details, created_at
       FROM audit_log ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all());
  } catch {
    return json({ error: 'A migração database/migrations/legacy/migration_security.sql ainda não foi executada neste banco.' }, 500);
  }

  return json({ entries: results });
}
