import { json, getAuthUser } from './_utils.js';
import { getUserPermissions } from './_permissions.js';

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);
  const permissions = await getUserPermissions(env, user);

  let theme = null;
  try {
    const row = await env.DB.prepare('SELECT theme FROM users WHERE id = ?').bind(user.id).first();
    if (['auto', 'light', 'dark', 'contrast'].includes(row?.theme)) theme = row.theme;
  } catch {
    // Compatibilidade enquanto database/migrations/legacy/migration_theme_v3.sql ainda não foi executada.
  }

  return json({ user: { ...user, theme, permissions } });
}
