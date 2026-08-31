import { json, getAuthUser } from './_utils.js';
import { getUserPermissions } from './_permissions.js';

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  const permissions = await getUserPermissions(env, user);

  // Regra do módulo eMulti: cada profissional pertence a, no máximo, uma
  // equipe. Durante a transição mantemos a consulta tolerante caso ainda
  // existam vínculos antigos duplicados no banco e devolvemos o primeiro.
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
  } catch {
    // Migração da Regulação ainda não aplicada: não impede o /api/me.
  }

  let theme = 'light';
  try {
    const row = await env.DB.prepare('SELECT theme FROM users WHERE id = ?').bind(user.id).first();
    if (['auto', 'light', 'dark', 'contrast'].includes(row?.theme)) theme = row.theme;
  } catch {
    // Compatibilidade enquanto migration_theme_v3.sql ainda não foi executada.
  }

  return json({
    user: {
      ...user,
      theme,
      permissions,
      equipe: equipe ? { id: equipe.id, nome: equipe.nome } : null,
    },
  });
}
