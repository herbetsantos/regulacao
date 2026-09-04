import { json, getAuthUser } from './_utils.js';
import { getUserPermissions, getRegulacaoAccessProfile } from './_permissions.js';

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  const [permissions, regulacao] = await Promise.all([
    getUserPermissions(env, user),
    getRegulacaoAccessProfile(env, user),
  ]);

  let equipe = null;
  try {
    equipe = await env.DB.prepare(
      `SELECT e.id, e.nome
       FROM regulacao_equipe_profissionais ep
       JOIN regulacao_equipes e ON e.id = ep.equipe_id AND e.ativo = 1
       WHERE ep.user_id = ?
       ORDER BY e.nome ASC
       LIMIT 1`
    ).bind(user.id).first();
  } catch { /* migração ainda não aplicada */ }

  let theme = null;
  try {
    const row = await env.DB.prepare('SELECT theme FROM users WHERE id = ?').bind(user.id).first();
    if (['auto', 'light', 'dark', 'contrast'].includes(row?.theme)) theme = row.theme;
  } catch { /* tema opcional */ }

  return json({
    user: {
      ...user,
      theme,
      permissions,
      regulacao,
      equipe: equipe ? { id: equipe.id, nome: equipe.nome } : null,
    },
  });
}
