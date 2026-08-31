// GET  /api/regulacao/guias?situacao=&especialidade_id=&unidade_executante=&cpf=
//      -> lista guias, restrita ao escopo de unidades do usuário
// POST /api/regulacao/guias -> cria guia (retorna aviso[] se já houver guia
//      ativa do mesmo paciente/especialidade)

import { json, logAudit } from '../_utils.js';
import {
  requireRegulacaoAccess, getRegulacaoScope, inClause, onlyDigits,
  findGuiasAtivasMesmaEspecialidade, situacaoLabel,
} from '../_shared.js';

const SITUACOES_VALIDAS = ['aguardando_autorizacao', 'lista_espera', 'em_atendimento', 'concluido', 'negado'];

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const scope = await getRegulacaoScope(env, user);
  const url = new URL(request.url);
  const situacao = url.searchParams.get('situacao');
  const especialidadeId = url.searchParams.get('especialidade_id');
  const unidadeExecutante = url.searchParams.get('unidade_executante');
  const cpf = onlyDigits(url.searchParams.get('cpf') || '');

  // Escopo: o usuário vê uma guia se:
  //  (a) a unidade solicitante ou a unidade executante dela está entre as
  //      unidades onde ele emite/executa (acesso direto OU via equipe,
  //      já unificados dentro de scope.executantes); OU
  //  (b) a guia AINDA NÃO tem unidade executante definida (fila de
  //      triagem) e o usuário tem QUALQUER acesso de execução — é assim
  //      que os profissionais das equipes multidisciplinares enxergam o
  //      que chegou pra triar (decidir se vira atendimento individual, em
  //      grupo, e em qual unidade), antes de alguém "assumir" a guia.
  const codigosVisiveis = Array.from(new Set([...scope.emissoras, ...scope.executantes]));
  if (!scope.isAdmin && codigosVisiveis.length === 0) {
    return json({ guias: [] }); // usuário sem nenhuma unidade/equipe vinculada ainda
  }

  const where = [];
  const binds = [];

  if (!scope.isAdmin) {
    const { clause, binds: b } = inClause(codigosVisiveis);
    const podeTriar = scope.executantes.length > 0;
    if (podeTriar) {
      where.push(`(g.unidade_solicitante_code IN ${clause} OR g.unidade_executante_code IN ${clause} OR g.unidade_executante_code IS NULL)`);
      binds.push(...b, ...b);
    } else {
      where.push(`(g.unidade_solicitante_code IN ${clause} OR g.unidade_executante_code IN ${clause})`);
      binds.push(...b, ...b);
    }
  }
  if (situacao && SITUACOES_VALIDAS.includes(situacao)) {
    where.push('g.situacao = ?');
    binds.push(situacao);
  }
  if (especialidadeId) {
    where.push('g.especialidade_id = ?');
    binds.push(especialidadeId);
  }
  if (unidadeExecutante) {
    where.push('g.unidade_executante_code = ?');
    binds.push(unidadeExecutante);
  }
  if (cpf) {
    where.push('g.cpf = ?');
    binds.push(cpf);
  }

  const sql = `
    SELECT g.*, e.nome AS especialidade_nome, p.nome AS paciente_nome
    FROM guias g
    JOIN especialidades e ON e.id = g.especialidade_id
    JOIN pacientes p ON p.cpf = g.cpf
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY g.created_at DESC
    LIMIT 300`;

  const { results } = await env.DB_REGULACAO.prepare(sql).bind(...binds).all();
  return json({ guias: results });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const cpf = onlyDigits(body.cpf);
  const unidade_solicitante_code = (body.unidade_solicitante_code || '').trim();
  const medico_solicitante = (body.medico_solicitante || '').trim();
  const especialidade_id = Number(body.especialidade_id);
  const motivo = (body.motivo || '').trim();
  const cid10 = (body.cid10 || '').trim() || null;
  const confirmarMesmoAssim = !!body.confirmar_mesmo_assim;

  if (!cpf) return json({ error: 'CPF do paciente é obrigatório.' }, 400);
  if (!unidade_solicitante_code) return json({ error: 'Unidade solicitante é obrigatória.' }, 400);
  if (!medico_solicitante) return json({ error: 'Médico solicitante é obrigatório.' }, 400);
  if (!especialidade_id) return json({ error: 'Especialidade é obrigatória.' }, 400);
  if (!motivo) return json({ error: 'Motivo do encaminhamento é obrigatório.' }, 400);

  const paciente = await env.DB_REGULACAO.prepare('SELECT cpf FROM pacientes WHERE cpf = ?').bind(cpf).first();
  if (!paciente) return json({ error: 'Paciente não encontrado. Cadastre o paciente antes de criar a guia.' }, 404);

  const scope = await getRegulacaoScope(env, user);
  if (!scope.isAdmin && !scope.emissoras.includes(unidade_solicitante_code)) {
    return json({ error: 'Você não tem permissão para emitir guias por essa unidade.' }, 403);
  }

  const unidade = await env.DB.prepare('SELECT code FROM unidades WHERE code = ? AND ativo = 1')
    .bind(unidade_solicitante_code).first();
  if (!unidade) return json({ error: 'Unidade solicitante inválida.' }, 400);

  const especialidade = await env.DB_REGULACAO.prepare('SELECT id, nome FROM especialidades WHERE id = ? AND ativo = 1')
    .bind(especialidade_id).first();
  if (!especialidade) return json({ error: 'Especialidade inválida.' }, 400);

  // Aviso de pré-existência: não bloqueia, só avisa (e exige confirmação
  // explícita do front-end antes de gravar, para não duplicar sem querer).
  const ativas = await findGuiasAtivasMesmaEspecialidade(env, cpf, especialidade_id);
  if (ativas.length > 0 && !confirmarMesmoAssim) {
    return json({
      aviso: true,
      mensagem: `Este paciente já possui ${ativas.length} guia(s) ativa(s) para ${especialidade.nome} (${ativas.map((a) => situacaoLabel(a.situacao)).join(', ')}). Deseja criar mesmo assim?`,
      guias_existentes: ativas,
    }, 200);
  }

  const result = await env.DB_REGULACAO.prepare(
    `INSERT INTO guias (cpf, unidade_solicitante_code, medico_solicitante, especialidade_id, motivo, cid10, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(cpf, unidade_solicitante_code, medico_solicitante, especialidade_id, motivo, cid10, user.id).run();

  const guiaId = result.meta.last_row_id;
  await logAudit(env, user, 'create', 'guia', guiaId, { cpf, especialidade_id });

  const guia = await env.DB_REGULACAO.prepare('SELECT * FROM guias WHERE id = ?').bind(guiaId).first();
  return json({ guia }, 201);
}
