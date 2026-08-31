import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';

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
    banco_conteudo_ok: false,
    pacientes: null,
    guias: null,
    unidades_aps: null,
    equipes_ativas: null,
    vinculos_equipe_unidade: null,
    profissionais_com_equipe: null,
    profissionais_em_multiplas_equipes: null,
    agentes_emissores: null,
    icones_links_ok: false,
    avisos: [],
  };

  try {
    diagnostico.pacientes = await safeCount(env.DB_REGULACAO.prepare('SELECT COUNT(*) AS n FROM pacientes'));
    diagnostico.guias = await safeCount(env.DB_REGULACAO.prepare('SELECT COUNT(*) AS n FROM guias'));
    diagnostico.banco_conteudo_ok = diagnostico.pacientes !== null && diagnostico.guias !== null;
  } catch {
    diagnostico.avisos.push('O banco regulacao-vagas-db não está acessível ou o schema_regulacao.sql ainda não foi executado.');
  }

  diagnostico.unidades_aps = await safeCount(env.DB.prepare("SELECT COUNT(*) AS n FROM unidades WHERE ativo = 1 AND tipo = 'aps'"));
  if (diagnostico.unidades_aps === null) {
    diagnostico.avisos.push('A coluna unidades.tipo não foi encontrada. Rode a migração de configuração da Regulação no banco do Portal.');
  } else if (diagnostico.unidades_aps === 0) {
    diagnostico.avisos.push('Nenhuma unidade está classificada como APS; o cadastro de pacientes fica sem unidade de referência.');
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

  if (diagnostico.vinculos_equipe_unidade === 0) diagnostico.avisos.push('As equipes ainda não possuem unidades vinculadas.');
  if (diagnostico.profissionais_com_equipe === 0) diagnostico.avisos.push('Nenhum profissional está vinculado a uma equipe.');
  if (diagnostico.profissionais_em_multiplas_equipes > 0) diagnostico.avisos.push('Há profissional vinculado a mais de uma equipe; a regra atual permite apenas uma.');
  if (diagnostico.agentes_emissores === 0) diagnostico.avisos.push('Nenhum usuário comum possui permissão de emissão de guia. Administradores ainda podem emitir.');

  try {
    await env.DB.prepare('SELECT 1 FROM regulacao_link_icons LIMIT 1').first();
    diagnostico.icones_links_ok = true;
  } catch {
    diagnostico.avisos.push('A migração v2 de ícones dos Links úteis ainda não foi aplicada.');
  }

  return json({ diagnostico });
}
