// GET /api/regulacao-bootstrap
// Carregamento compacto dos filtros da fila.
// Evita três chamadas HTTP separadas e três revalidações completas de acesso.

import { json } from './_utils.js';
import { requireRegulacaoAccess, getUserEquipeIds, inClause } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const especialidadesPromise = env.DB_REGULACAO.prepare(
    `SELECT id,nome
     FROM especialidades
     WHERE ativo=1
     ORDER BY sort_order ASC,nome ASC`
  ).all();

  const unidadesPromise = env.DB.prepare(
    `SELECT code,nome
     FROM unidades
     WHERE ativo=1
     ORDER BY sort_order ASC,nome ASC`
  ).all();

  const equipesPromise = (async () => {
    if (access.administrador) {
      return env.DB.prepare(
        `SELECT id,nome
         FROM regulacao_equipes
         WHERE ativo=1
         ORDER BY nome ASC`
      ).all();
    }

    const ids = await getUserEquipeIds(env, user);
    if (!ids.length) return { results: [] };

    const { clause, binds } = inClause(ids);
    return env.DB.prepare(
      `SELECT id,nome
       FROM regulacao_equipes
       WHERE ativo=1 AND id IN ${clause}
       ORDER BY nome ASC`
    ).bind(...binds).all();
  })();

  const [especialidades, unidades, equipes] = await Promise.all([
    especialidadesPromise,
    unidadesPromise,
    equipesPromise,
  ]);

  return json({
    especialidades: especialidades.results || [],
    unidades: unidades.results || [],
    equipes: equipes.results || [],
  });
}
