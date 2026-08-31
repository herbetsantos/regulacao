// GET /api/regulacao/unidades
// Devolve as listas de unidade relevantes para montar os formulários:
//  - aps: todas as unidades de Atenção Primária ativas (para "Unidade de
//    Referência" do paciente) — não é filtrado pelo escopo do usuário, pois
//    qualquer unidade de referência é um dado do paciente, não do usuário.
//  - todas: todas as unidades ativas (para "Unidade Solicitante" da guia,
//    que pode ser qualquer unidade — mas o formulário deve restringir ao
//    escopo emissor do usuário, veja "minhasEmissoras").
//  - minhasEmissoras / minhasExecutantes: escopo do usuário logado.

import { json } from './_utils.js';
import { requireRegulacaoAccess, getRegulacaoScope } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

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
}
