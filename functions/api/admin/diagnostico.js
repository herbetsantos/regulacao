import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import {
  getRegulacaoSchemaStatus,
  listUnidadesAtivasComTipo,
  hasUnidadesTipoColumn,
} from '../_db.js';
import { getPortalSchemaStatus } from './_portal-db.js';

async function safeCount(stmt, fallback = null) {
  try {
    const row = await stmt.first();
    return Number(row?.n ?? row?.count ?? 0);
  } catch {
    return fallback;
  }
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;

  const diagnostico = {
    binding_regulacao_ok: false,
    banco_conteudo_ok: false,
    cadastro_cidadao_pronto: false,
    tabelas_regulacao_faltantes: [],
    colunas_endereco_faltantes: [],
    colunas_integracao_esus_faltantes: [],
    colunas_fluxo_v210_faltantes: [],
    colunas_agenda_faltantes: [],
    portal_schema_ok: false,
    tabelas_portal_faltantes: [],
    profissionais_base: 0,
    lotacoes_base: 0,
    escalas_base: 0,
    reparo_regulacao_disponivel: false,
    pacientes: null,
    guias: null,
    unidades_aps: null,
    unidades_tipo_coluna: null,
    unidades_tipo_fonte: null,
    equipes_ativas: null,
    vinculos_equipe_unidade: null,
    profissionais_com_equipe: null,
    profissionais_em_multiplas_equipes: null,
    agentes_emissores: null,
    acessos_configurados: null,
    cadastrantes: null,
    reguladores: null,
    executores: null,
    administradores_regulacao: null,
    icones_links_ok: false,
    avisos: [],
  };

  const schema = await getRegulacaoSchemaStatus(env);
  diagnostico.binding_regulacao_ok = schema.bindingOk;
  diagnostico.banco_conteudo_ok = schema.schemaOk;
  diagnostico.tabelas_regulacao_faltantes = schema.tabelasFaltantes || [];
  diagnostico.colunas_endereco_faltantes = schema.colunasPacienteEnderecoFaltantes || [];
  diagnostico.colunas_integracao_esus_faltantes = schema.colunasPacienteIntegracaoFaltantes || [];
  diagnostico.colunas_fluxo_v210_faltantes = schema.colunasFluxoV210Faltantes || [];
  diagnostico.colunas_agenda_faltantes = schema.colunasAgendaFaltantes || [];
  diagnostico.reparo_regulacao_disponivel = schema.bindingOk && !schema.schemaOk;

  const portalSchema = await getPortalSchemaStatus(env);
  diagnostico.portal_schema_ok = portalSchema.schemaOk;
  diagnostico.tabelas_portal_faltantes = portalSchema.tabelasFaltantes || [];
  diagnostico.profissionais_base = portalSchema.profissionaisBase || 0;
  diagnostico.lotacoes_base = portalSchema.lotacoesBase || 0;
  diagnostico.escalas_base = portalSchema.escalasBase || 0;
  diagnostico.atualizacao_bancos_disponivel = !portalSchema.schemaOk || !schema.schemaOk;

  if (!schema.bindingOk) {
    diagnostico.avisos.push('O binding DB_REGULACAO não está configurado. Vincule o banco regulacao-vagas-db ao projeto eMulti no Cloudflare Pages.');
  } else if (!schema.schemaOk) {
    if ((schema.tabelasFaltantes || []).length) {
      diagnostico.avisos.push(`Estrutura do banco da Regulação incompleta. Tabelas ausentes: ${(schema.tabelasFaltantes || []).join(', ')}.`);
    }
    if ((schema.colunasPacienteEnderecoFaltantes || []).length) {
      diagnostico.avisos.push(`Cadastro de endereço ainda está no formato legado. Campos estruturados ausentes em pacientes: ${schema.colunasPacienteEnderecoFaltantes.join(', ')}. Use o reparo não destrutivo para habilitar a integração completa com CEP.`);
    }
    if ((schema.colunasFluxoV210Faltantes || []).length) {
      diagnostico.avisos.push(`Fluxo v2.10 incompleto. Estruturas ausentes: ${schema.colunasFluxoV210Faltantes.join(', ')}. Use o reparo não destrutivo.`);
    }
    if ((schema.colunasAgendaFaltantes || []).length) {
      diagnostico.avisos.push(`Agenda e atendimentos incompletos. Campos ausentes: ${schema.colunasAgendaFaltantes.join(', ')}.`);
    }
    if ((schema.colunasPacienteIntegracaoFaltantes || []).length) {
      diagnostico.avisos.push(`Integração e-SUS PEC ainda não está completa. Campos ausentes em pacientes: ${schema.colunasPacienteIntegracaoFaltantes.join(', ')}. Use o reparo não destrutivo para habilitar o CNS.`);
    }
  }

  if (!portalSchema.schemaOk) {
    if ((portalSchema.tabelasFaltantes || []).length) diagnostico.avisos.push(`Estrutura complementar do Portal incompleta: ${portalSchema.tabelasFaltantes.join(', ')}.`);
    if (!portalSchema.lotacoesBase || !portalSchema.escalasBase) diagnostico.avisos.push('O pré-cadastro dos profissionais existe, mas as lotações/horários de referência ainda não estão completos.');
  }

  if (schema.bindingOk) {
    diagnostico.pacientes = await safeCount(env.DB_REGULACAO.prepare('SELECT COUNT(*) AS n FROM pacientes'));
    diagnostico.guias = await safeCount(env.DB_REGULACAO.prepare('SELECT COUNT(*) AS n FROM guias'));
  }

  try {
    diagnostico.unidades_tipo_coluna = await hasUnidadesTipoColumn(env);
    const { unidades, tipoFonte } = await listUnidadesAtivasComTipo(env);
    diagnostico.unidades_tipo_fonte = tipoFonte;
    diagnostico.unidades_aps = unidades.filter((u) => u.tipo === 'aps').length;

    if (!diagnostico.unidades_tipo_coluna) {
      diagnostico.avisos.push('A coluna unidades.tipo ainda não existe no Portal. O eMulti está usando uma classificação APS de compatibilidade; recomenda-se aplicar a migração do Portal quando possível.');
    }
    if (diagnostico.unidades_aps === 0) {
      diagnostico.avisos.push('Nenhuma unidade foi reconhecida como APS; o cadastro de pacientes ficará sem unidade de referência.');
    }
  } catch (err) {
    diagnostico.unidades_aps = null;
    diagnostico.avisos.push(`Não foi possível ler as unidades do Portal: ${String(err?.message || '')}`);
  }

  diagnostico.equipes_ativas = await safeCount(env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_equipes WHERE ativo = 1'));
  diagnostico.vinculos_equipe_unidade = await safeCount(env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_equipe_unidades'));
  diagnostico.profissionais_com_equipe = await safeCount(env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM regulacao_equipe_profissionais'));
  diagnostico.profissionais_em_multiplas_equipes = await safeCount(env.DB.prepare(
    `SELECT COUNT(*) AS n FROM (
       SELECT user_id FROM regulacao_equipe_profissionais GROUP BY user_id HAVING COUNT(*) > 1
     )`
  ));
  diagnostico.agentes_emissores = await safeCount(env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM regulacao_user_unidades WHERE pode_emitir = 1'));
  diagnostico.acessos_configurados = await safeCount(env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_user_acessos'));
  diagnostico.cadastrantes = await safeCount(env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_user_acessos WHERE cadastrante = 1 OR administrador = 1'));
  diagnostico.reguladores = await safeCount(env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_user_acessos WHERE regulador = 1 OR administrador = 1'));
  diagnostico.executores = await safeCount(env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_user_acessos WHERE executor = 1 OR administrador = 1'));
  diagnostico.administradores_regulacao = await safeCount(env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_user_acessos WHERE administrador = 1'));

  if (diagnostico.equipes_ativas === null) diagnostico.avisos.push('As tabelas de equipes da Regulação ainda não existem no banco do Portal.');
  if (diagnostico.vinculos_equipe_unidade === 0) diagnostico.avisos.push('As equipes ainda não possuem unidades vinculadas.');
  if (diagnostico.profissionais_com_equipe === 0) diagnostico.avisos.push('Nenhum profissional está vinculado a uma equipe.');
  if ((diagnostico.profissionais_em_multiplas_equipes || 0) > 0) diagnostico.avisos.push('Há profissional vinculado a mais de uma equipe; a regra atual permite apenas uma.');
  if (diagnostico.acessos_configurados === null) diagnostico.avisos.push('A migração v2.6 de acessos próprios da Regulação ainda não foi aplicada ao portal-saude-db.');
  if (diagnostico.cadastrantes === 0) diagnostico.avisos.push('Nenhum Cadastrante foi definido. Sem esse perfil, usuários comuns não poderão cadastrar cidadãos nem emitir guias.');
  if (diagnostico.agentes_emissores === 0) diagnostico.avisos.push('Nenhuma unidade de emissão está vinculada a Cadastrantes. O cadastro de cidadão pode funcionar, mas a emissão de guias ficará bloqueada.');

  diagnostico.cadastro_cidadao_pronto = !!(
    diagnostico.binding_regulacao_ok &&
    diagnostico.banco_conteudo_ok &&
    (diagnostico.unidades_aps || 0) > 0 &&
    diagnostico.acessos_configurados !== null
  );

  try {
    await env.DB.prepare('SELECT 1 FROM regulacao_link_icons LIMIT 1').first();
    diagnostico.icones_links_ok = true;
  } catch {
    diagnostico.avisos.push('A migração v2 de ícones dos Links úteis ainda não foi aplicada.');
  }

  return json({ diagnostico });
}
