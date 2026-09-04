// GET /api/admin/usuarios -> lista básica de usuários (sem dados
// sensíveis) para preencher seletores nas telas de administração.

import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;

  const { results } = await env.DB.prepare(
    `SELECT id, username, name, role, active FROM users WHERE active = 1 ORDER BY name ASC`
  ).all();

  return json({ usuarios: results });
}
