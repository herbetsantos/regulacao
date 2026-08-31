import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import {
  getRegulacaoSchemaStatus,
  listUnidadesAtivasComTipo,
  hasUnidadesTipoColumn,
} from '../_db.js';

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
    tabelas_regulacao_faltantes: [],
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
    icones_links_ok: false,
    avisos: [],
  };

  const schema = await getRegulacaoSchemaStatus(env);
  diagnostico.binding_regulacao_ok = schema.bindingOk;
  diagnostico.banco_conteudo_ok = schema.schemaOk;
  diagnostico.tabelas_regulacao_faltantes = schema.tabelasFaltantes || [];
  diagnostico.reparo_regulacao_disponivel = schema.bindingOk && !schema.schemaOk;

  if (!schema.bindingOk) {
    diagnostico.avisos.push('O binding DB_REGULACAO não está configurado. Vincule o banco regulacao-vagas-db ao projeto eMulti no Cloudflare Pages.');
  } else if (!schema.schemaOk) {
    diagnostico.avisos.push(`Estrutura do banco da Regulação incompleta. Tabelas ausentes: ${(schema.tabelasFaltantes || []).join(', ') || 'não identificadas'}.`);
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

  if (diagnostico.equipes_ativas === null) diagnostico.avisos.push('As tabelas de equipes da Regulação ainda não existem no banco do Portal.');
  if (diagnostico.vinculos_equipe_unidade === 0) diagnostico.avisos.push('As equipes ainda não possuem unidades vinculadas.');
  if (diagnostico.profissionais_com_equipe === 0) diagnostico.avisos.push('Nenhum profissional está vinculado a uma equipe.');
  if ((diagnostico.profissionais_em_multiplas_equipes || 0) > 0) diagnostico.avisos.push('Há profissional vinculado a mais de uma equipe; a regra atual permite apenas uma.');
  if (diagnostico.agentes_emissores === 0) diagnostico.avisos.push('Nenhum usuário comum possui permissão de emissão de guia. Administradores ainda podem emitir.');

  try {
    await env.DB.prepare('SELECT 1 FROM regulacao_link_icons LIMIT 1').first();
    diagnostico.icones_links_ok = true;
  } catch {
    diagnostico.avisos.push('A migração v2 de ícones dos Links úteis ainda não foi aplicada.');
  }

  return json({ diagnostico });
}
