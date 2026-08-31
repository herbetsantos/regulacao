import { json, getAuthUser } from './_utils.js';
import { getUserPermissions } from './_permissions.js';

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);
  const permissions = await getUserPermissions(env, user);
  return json({ user: { ...user, permissions } });
}
