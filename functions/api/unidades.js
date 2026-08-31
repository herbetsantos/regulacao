// GET /api/unidades
// Devolve unidades do Portal já considerando o escopo do usuário.
// Compatível também com instalações antigas que ainda não possuem a coluna
// unidades.tipo: nesse caso a classificação APS é inferida pela lista oficial.

import { json } from './_utils.js';
import { requireRegulacaoAccess, getRegulacaoScope } from './_shared.js';
import { listUnidadesAtivasComTipo } from './_db.js';

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  try {
    const { unidades: todas, tipoFonte } = await listUnidadesAtivasComTipo(env);
    const aps = todas.filter((u) => u.tipo === 'aps').map(({ code, nome }) => ({ code, nome }));

    // O escopo pode estar vazio se as tabelas de configuração da Regulação
    // ainda não tiverem sido criadas. Isso não bloqueia o cadastro de paciente.
    const scope = await getRegulacaoScope(env, user);
    const nomePorCodigo = Object.fromEntries(todas.map((u) => [u.code, u.nome]));

    return json({
      aps,
      todas,
      isAdmin: scope.isAdmin,
      minhasEmissoras: scope.emissoras.map((code) => ({ code, nome: nomePorCodigo[code] || code })),
      minhasExecutantes: scope.executantes.map((code) => ({ code, nome: nomePorCodigo[code] || code })),
      configuracao: {
        tipo_unidade_fonte: tipoFonte,
        aviso: tipoFonte === 'inferido'
          ? 'A coluna unidades.tipo ainda não existe no Portal. O eMulti está usando temporariamente a classificação APS conhecida para manter o cadastro funcionando.'
          : null,
      },
    });
  } catch (err) {
    return json({
      error: 'Não foi possível carregar as unidades do Portal.',
      codigo: 'UNIDADES_INDISPONIVEIS',
      detalhe: String(err?.message || ''),
    }, 503);
  }
}
