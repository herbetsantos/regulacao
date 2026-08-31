// Checagem de permissão para este projeto. Lê as MESMAS tabelas
// role_permissions/user_permissions do banco compartilhado (env.DB =
// portal-saude-db) que o painel Administração > Perfis de acesso do portal
// já gerencia — só que aqui a gente só se importa com a feature
// 'regulacao_vagas'. Mesma lógica de "teto do papel + exceção por usuário"
// e mesmo fail-open em caso de erro/tabela ausente, para consistência com
// o portal.

const FEATURE_KEY = 'regulacao_vagas';

export async function getRoleCeiling(env, role) {
  if (role === 'super_admin') return { [FEATURE_KEY]: true };
  try {
    const row = await env.DB.prepare(
      'SELECT enabled FROM role_permissions WHERE role = ? AND feature_key = ?'
    ).bind(role, FEATURE_KEY).first();
    return { [FEATURE_KEY]: row ? !!row.enabled : false };
  } catch {
    return { [FEATURE_KEY]: true };
  }
}

export async function getUserPermissions(env, user) {
  if (user.role === 'super_admin') return { [FEATURE_KEY]: true };
  const ceiling = await getRoleCeiling(env, user.role);
  try {
    const row = await env.DB.prepare(
      'SELECT enabled FROM user_permissions WHERE user_id = ? AND feature_key = ?'
    ).bind(user.id, FEATURE_KEY).first();
    const wanted = row ? !!row.enabled : ceiling[FEATURE_KEY];
    return { [FEATURE_KEY]: ceiling[FEATURE_KEY] && wanted };
  } catch {
    return ceiling;
  }
}
