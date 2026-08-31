// Helpers compartilhados pelos endpoints de /api/*.
//
// Este módulo lê o banco de LOGIN (env.DB = portal-saude-db) para
// autenticação/escopo de unidades e equipes, e o banco de CONTEÚDO
// (env.DB_REGULACAO) para pacientes/guias/acompanhamentos/notificações.

import { getAuthUser, json } from './_utils.js';
import { getUserPermissions } from './_permissions.js';

// Autentica e confere a feature 'regulacao_vagas'. Devolve { user } ou
// { error: Response }, igual ao padrão de requireAuth/requireAdmin.
export async function requireRegulacaoAccess(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };

  if (user.role === 'super_admin' || user.role === 'admin') {
    return { user };
  }
  const permissions = await getUserPermissions(env, user);
  if (!permissions.regulacao_vagas) {
    return { error: json({ error: 'Você não tem acesso à Regulação de Vagas.' }, 403) };
  }
  return { user };
}

// Autentica e exige admin/super_admin — usado pelas telas/endpoints de
// configuração (equipes, agentes operacionais, especialidades). Mesmo
// critério que já é tratado como "acesso irrestrito" no resto do módulo
// (getRegulacaoScope trata admin e super_admin de forma idêntica).
export async function requireAdminAccess(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return { error: json({ error: 'Apenas administradores podem acessar isso.' }, 403) };
  }
  return { user };
}

// Escopo de unidades do usuário dentro deste módulo:
//  - isAdmin: admin/super_admin enxergam e emitem/executam por qualquer unidade.
//  - emissoras: códigos de unidade onde o usuário pode CRIAR/ver guias como
//    unidade solicitante (papel de AGENTE OPERACIONAL — vínculo direto,
//    regulacao_user_unidades.pode_emitir).
//  - executantes: códigos de unidade onde o usuário gerencia a fila/triagem/
//    acompanhamentos como unidade executante. É a UNIÃO de duas fontes:
//      (a) vínculo direto (regulacao_user_unidades.pode_executar);
//      (b) unidades atendidas por qualquer EQUIPE multidisciplinar da qual
//          o usuário é profissional membro.
export async function getRegulacaoScope(env, user) {
  if (user.role === 'admin' || user.role === 'super_admin') {
    const { results } = await env.DB.prepare(
      'SELECT code FROM unidades WHERE ativo = 1'
    ).all();
    const todas = results.map((r) => r.code);
    return { isAdmin: true, emissoras: todas, executantes: todas };
  }

  // Instalações mais antigas do Portal podem ainda não ter recebido as
  // tabelas de configuração da Regulação. Isso NÃO deve impedir a tela de
  // pacientes de carregar. Nesse caso devolvemos escopo vazio para usuários
  // comuns; a emissão de guias continua corretamente bloqueada até o admin
  // configurar os vínculos.
  let diretoResult = { results: [] };
  let equipeResult = { results: [] };
  try {
    [diretoResult, equipeResult] = await Promise.all([
      env.DB.prepare(
        `SELECT ru.unidade_code, ru.pode_emitir, ru.pode_executar
         FROM regulacao_user_unidades ru
         JOIN unidades u ON u.code = ru.unidade_code
         WHERE ru.user_id = ? AND u.ativo = 1`
      ).bind(user.id).all(),
      env.DB.prepare(
        `SELECT DISTINCT eu.unidade_code
         FROM regulacao_equipe_profissionais ep
         JOIN regulacao_equipes e ON e.id = ep.equipe_id AND e.ativo = 1
         JOIN regulacao_equipe_unidades eu ON eu.equipe_id = ep.equipe_id
         JOIN unidades u ON u.code = eu.unidade_code AND u.ativo = 1
         WHERE ep.user_id = ?`
      ).bind(user.id).all(),
    ]);
  } catch {
    return { isAdmin: false, emissoras: [], executantes: [] };
  }

  const emissoras = (diretoResult.results || []).filter((r) => r.pode_emitir).map((r) => r.unidade_code);
  const executantesDireto = (diretoResult.results || []).filter((r) => r.pode_executar).map((r) => r.unidade_code);
  const executantesEquipe = (equipeResult.results || []).map((r) => r.unidade_code);
  const executantes = Array.from(new Set([...executantesDireto, ...executantesEquipe]));

  return { isAdmin: false, emissoras, executantes };
}

// Ids das equipes das quais o usuário é profissional (vazio se nenhuma).
export async function getUserEquipeIds(env, user) {
  const { results } = await env.DB.prepare(
    'SELECT equipe_id FROM regulacao_equipe_profissionais WHERE user_id = ?'
  ).bind(user.id).all();
  return results.map((r) => r.equipe_id);
}

// O usuário é profissional membro dessa equipe? admin/super_admin sempre
// contam como membros, para fins de autorização.
export async function isEquipeMember(env, user, equipeId) {
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  const row = await env.DB.prepare(
    'SELECT 1 FROM regulacao_equipe_profissionais WHERE user_id = ? AND equipe_id = ?'
  ).bind(user.id, equipeId).first();
  return !!row;
}

// Dados básicos de uma equipe (nome + unidades cobertas) — usados tanto
// pra validar a unidade executante escolhida quanto pra compor a mensagem
// de notificação de transferência.
export async function getEquipeInfo(env, equipeId) {
  const equipe = await env.DB.prepare(
    'SELECT id, nome FROM regulacao_equipes WHERE id = ? AND ativo = 1'
  ).bind(equipeId).first();
  if (!equipe) return null;
  const { results } = await env.DB.prepare(
    `SELECT u.code, u.nome FROM regulacao_equipe_unidades eu
     JOIN unidades u ON u.code = eu.unidade_code AND u.ativo = 1
     WHERE eu.equipe_id = ?`
  ).bind(equipeId).all();
  return { id: equipe.id, nome: equipe.nome, unidades: results };
}

// Grava uma notificação para uma equipe (banco de conteúdo, já que
// referencia guia_id que vive lá).
export async function inserirNotificacao(env, { equipeId, guiaId, tipo, mensagem, createdBy }) {
  await env.DB_REGULACAO.prepare(
    `INSERT INTO notificacoes (equipe_id, guia_id, tipo, mensagem, created_by) VALUES (?, ?, ?, ?, ?)`
  ).bind(equipeId, guiaId ?? null, tipo, mensagem, createdBy ?? null).run();
}

// Monta a cláusula "IN (?, ?, ...)" com segurança (evita SQL injection via
// concatenação direta) para filtrar por uma lista de códigos de unidade.
export function inClause(codes) {
  if (!codes.length) return { clause: '(NULL)', binds: [] };
  return { clause: `(${codes.map(() => '?').join(',')})`, binds: codes };
}

export function isValidCPF(cpf) {
  return typeof cpf === 'string' && /^\d{11}$/.test(cpf);
}

export function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

const SITUACOES_ATIVAS = ['aguardando_autorizacao', 'lista_espera', 'em_atendimento'];

export function situacaoLabel(s) {
  return {
    aguardando_autorizacao: 'Aguardando autorização',
    lista_espera: 'Em lista de espera',
    em_atendimento: 'Em atendimento',
    concluido: 'Concluído',
    negado: 'Negado',
  }[s] || s;
}

// Usado ao criar uma nova guia: verifica se o paciente já tem outra guia
// para a MESMA especialidade em situação ativa (aguardando autorização, em
// lista de espera ou em atendimento), para exibir o aviso de pré-existência
// pedido — sem bloquear a criação, só avisar.
export async function findGuiasAtivasMesmaEspecialidade(env, cpf, especialidadeId, excludeGuiaId = null) {
  const { clause, binds } = inClause(SITUACOES_ATIVAS);
  let sql = `SELECT id, situacao, created_at FROM guias
             WHERE cpf = ? AND especialidade_id = ? AND situacao IN ${clause}`;
  const params = [cpf, especialidadeId, ...binds];
  if (excludeGuiaId) {
    sql += ' AND id != ?';
    params.push(excludeGuiaId);
  }
  sql += ' ORDER BY created_at DESC';
  const { results } = await env.DB_REGULACAO.prepare(sql).bind(...params).all();
  return results;
}
