// Helpers compartilhados pelos endpoints de /api/*.
// env.DB = portal-saude-db (identidade, unidades, equipes e acessos)
// env.DB_REGULACAO = regulacao-vagas-db (pacientes, guias, atendimentos)

import { getAuthUser, json } from './_utils.js';
import { getRegulacaoAccessProfile, hasRegulacaoCapability } from './_permissions.js';

export async function requireRegulacaoAccess(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };

  let access;
  try {
    access = await getRegulacaoAccessProfile(env, user);
  } catch (err) {
    return { error: json({ error: 'Não foi possível consultar os acessos da Regulação.', detalhe: String(err?.message || '') }, 503) };
  }

  if (!access.acesso) {
    return { error: json({ error: 'Você não tem acesso à Regulação de Vagas.', codigo: 'SEM_ACESSO_REGULACAO' }, 403) };
  }
  return { user, access };
}

export async function requireRegulacaoCapability(request, env, capability, mensagem = null) {
  const auth = await requireRegulacaoAccess(request, env);
  if (auth.error) return auth;
  if (!hasRegulacaoCapability(auth.access, capability)) {
    return {
      error: json({
        error: mensagem || `Você não possui a responsabilidade necessária (${capability}) para realizar esta ação.`,
        codigo: `SEM_PERMISSAO_${String(capability).toUpperCase()}`,
      }, 403),
    };
  }
  return auth;
}

export async function requireAdminAccess(request, env) {
  return requireRegulacaoCapability(
    request,
    env,
    'administrador',
    'Apenas administradores da Regulação podem acessar esta configuração.'
  );
}

// Escopo territorial/operacional do usuário.
// Cadastrante usa unidades com pode_emitir=1.
// Regulador/Executor usam unidades da própria equipe e, por compatibilidade,
// vínculos diretos antigos com pode_executar=1.
export async function getRegulacaoScope(env, user, access = null) {
  access = access || await getRegulacaoAccessProfile(env, user);

  if (access.administrador) {
    const { results } = await env.DB.prepare('SELECT code FROM unidades WHERE ativo = 1').all();
    const todas = (results || []).map((r) => r.code);
    return { isAdmin: true, emissoras: todas, executantes: todas };
  }

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

  const emissoras = access.cadastrante
    ? (diretoResult.results || []).filter((r) => r.pode_emitir).map((r) => r.unidade_code)
    : [];

  let executantes = [];
  if (access.regulador || access.executor) {
    const diretas = (diretoResult.results || []).filter((r) => r.pode_executar).map((r) => r.unidade_code);
    const equipe = (equipeResult.results || []).map((r) => r.unidade_code);
    executantes = Array.from(new Set([...diretas, ...equipe]));
  }

  return { isAdmin: false, emissoras, executantes };
}

export async function getUserEquipeIds(env, user) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT equipe_id FROM regulacao_equipe_profissionais WHERE user_id = ?'
    ).bind(user.id).all();
    return (results || []).map((r) => r.equipe_id);
  } catch {
    return [];
  }
}

export async function isEquipeMember(env, user, equipeId, access = null) {
  access = access || await getRegulacaoAccessProfile(env, user);
  if (access.administrador) return true;
  const row = await env.DB.prepare(
    'SELECT 1 FROM regulacao_equipe_profissionais WHERE user_id = ? AND equipe_id = ?'
  ).bind(user.id, equipeId).first();
  return !!row;
}

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
  return { id: equipe.id, nome: equipe.nome, unidades: results || [] };
}

export async function inserirNotificacao(env, { equipeId, guiaId, tipo, mensagem, createdBy }) {
  await env.DB_REGULACAO.prepare(
    `INSERT INTO notificacoes (equipe_id, guia_id, tipo, mensagem, created_by) VALUES (?, ?, ?, ?, ?)`
  ).bind(equipeId, guiaId ?? null, tipo, mensagem, createdBy ?? null).run();
}

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
  return results || [];
}
