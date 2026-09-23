// GET /api/guias/atribuicao?cpf=...
// Resolve o destino operacional da guia a partir da unidade de referência
// do paciente. Cadastrantes não precisam conhecer a distribuição territorial.

import { json } from '../_utils.js';
import { requireRegulacaoCapability, onlyDigits, getAtribuicaoReferenciaPaciente } from '../_shared.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireRegulacaoCapability(
    request, env, 'cadastrante',
    'Seu usuário não possui responsabilidade de Cadastrante para emitir guias.'
  );
  if (error) return error;

  const cpf = onlyDigits(new URL(request.url).searchParams.get('cpf') || '');
  if (cpf.length !== 11) return json({ error:'Informe um CPF válido.' }, 400);

  const atribuicao = await getAtribuicaoReferenciaPaciente(env, cpf);
  if (!atribuicao) return json({ error:'Paciente não encontrado.' }, 404);

  const equipes = atribuicao.equipes || [];
  return json({
    unidade_referencia: atribuicao.unidadeReferencia,
    equipes,
    equipe: equipes.length === 1 ? equipes[0] : null,
    atribuicao_automatica: !!atribuicao.unidadeReferencia && equipes.length === 1,
    necessita_escolha_equipe: equipes.length > 1,
    sem_equipe_configurada: !!atribuicao.unidadeReferencia && equipes.length === 0,
    unidade_referencia_indisponivel: !atribuicao.unidadeReferencia,
  });
}
