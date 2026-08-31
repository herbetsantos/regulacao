// GET /api/unidades
// Devolve unidades do Portal já considerando o escopo do usuário.

import { json } from './_utils.js';
import { requireRegulacaoAccess, getRegulacaoScope } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  try {
    const { results: aps } = await env.DB.prepare(
      "SELECT code, nome FROM unidades WHERE ativo = 1 AND tipo = 'aps' ORDER BY nome ASC"
    ).all();
    const { results: todas } = await env.DB.prepare(
      'SELECT code, nome, tipo FROM unidades WHERE ativo = 1 ORDER BY nome ASC'
    ).all();

    const scope = await getRegulacaoScope(env, user);
    const nomePorCodigo = Object.fromEntries(todas.map((u) => [u.code, u.nome]));

    return json({
      aps,
      todas,
      isAdmin: scope.isAdmin,
      minhasEmissoras: scope.emissoras.map((code) => ({ code, nome: nomePorCodigo[code] || code })),
      minhasExecutantes: scope.executantes.map((code) => ({ code, nome: nomePorCodigo[code] || code })),
    });
  } catch (err) {
    return json({
      error: 'Configuração da Regulação incompleta no banco do Portal. Verifique a migração_regulacao_setup.sql e os vínculos de equipes/unidades.',
      detalhe: String(err?.message || ''),
    }, 503);
  }
}
