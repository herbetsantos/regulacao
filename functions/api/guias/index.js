// GET  /api/regulacao/guias?situacao=&especialidade_id=&unidade_executante=&cpf=
//      -> lista guias, restrita ao escopo de unidades do usuário
// POST /api/regulacao/guias -> cria guia (retorna aviso[] se já houver guia
//      ativa do mesmo paciente/especialidade)

import { json, logAudit } from '../_utils.js';
import {
  requireRegulacaoAccess, requireRegulacaoCapability, getRegulacaoScope, inClause, onlyDigits,
  findGuiasAtivasMesmaEspecialidade, situacaoLabel,
} from '../_shared.js';

const SITUACOES_VALIDAS = ['aguardando_autorizacao', 'lista_espera', 'em_atendimento', 'concluido', 'negado'];

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const scope = await getRegulacaoScope(env, user, access);
  const url = new URL(request.url);
  const situacao = url.searchParams.get('situacao');
  const especialidadeId = url.searchParams.get('especialidade_id');
  const unidadeExecutante = (url.searchParams.get('unidade_executante') || '').trim();
  const unidadeSolicitante = (url.searchParams.get('unidade_solicitante') || '').trim();
  const equipeId = Number(url.searchParams.get('equipe_id') || 0);
  const medicoSolicitante = (url.searchParams.get('medico_solicitante') || '').trim();
  const dataDe = (url.searchParams.get('data_de') || '').trim();
  const dataAte = (url.searchParams.get('data_ate') || '').trim();
  const q = (url.searchParams.get('q') || '').trim();
  const cpf = onlyDigits(url.searchParams.get('cpf') || '');
  const excludeId = Number(url.searchParams.get('exclude_id') || 0);
  const meus = url.searchParams.get('meus') === '1';
  const ordem = url.searchParams.get('ordem') === 'antigas' ? 'antigas' : 'recentes';
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const requestedPageSize = Number(url.searchParams.get('page_size') || 20);
  const pageSize = [1, 10, 20, 50, 100].includes(requestedPageSize) ? requestedPageSize : 20;
  const offset = (page - 1) * pageSize;

  const codigosVisiveis = Array.from(new Set([...scope.emissoras, ...scope.executantes]));
  if (!scope.isAdmin && codigosVisiveis.length === 0) {
    return json({ guias: [], total: 0, page, page_size: pageSize, total_pages: 1 });
  }

  const where = [];
  const binds = [];

  if (!scope.isAdmin) {
    const { clause, binds: b } = inClause(codigosVisiveis);
    const podeTriar = !!(access.regulador || access.administrador);
    if (podeTriar) {
      where.push(`(g.unidade_solicitante_code IN ${clause} OR g.unidade_executante_code IN ${clause} OR g.unidade_executante_code IS NULL)`);
      binds.push(...b, ...b);
    } else {
      where.push(`(g.unidade_solicitante_code IN ${clause} OR g.unidade_executante_code IN ${clause})`);
      binds.push(...b, ...b);
    }
  }
  if (situacao && SITUACOES_VALIDAS.includes(situacao)) { where.push('g.situacao = ?'); binds.push(situacao); }
  if (especialidadeId) { where.push('g.especialidade_id = ?'); binds.push(especialidadeId); }
  if (unidadeExecutante) { where.push('g.unidade_executante_code = ?'); binds.push(unidadeExecutante); }
  if (unidadeSolicitante) { where.push('g.unidade_solicitante_code = ?'); binds.push(unidadeSolicitante); }
  if (equipeId) { where.push('g.equipe_id = ?'); binds.push(equipeId); }
  if (medicoSolicitante) { where.push('LOWER(g.medico_solicitante) LIKE LOWER(?)'); binds.push(`%${medicoSolicitante}%`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataDe)) { where.push('date(g.created_at) >= date(?)'); binds.push(dataDe); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataAte)) { where.push('date(g.created_at) <= date(?)'); binds.push(dataAte); }
  if (cpf) { where.push('g.cpf = ?'); binds.push(cpf); }
  if (excludeId) { where.push('g.id <> ?'); binds.push(excludeId); }
  if (meus) { where.push('g.created_by = ?'); binds.push(user.id); }
  if (q) {
    const qDigits = onlyDigits(q);
    const like = `%${q}%`;
    const guideDigitsLike = `%${qDigits}%`;
    if (qDigits.length >= 3) {
      where.push(`(
        LOWER(p.nome) LIKE LOWER(?)
        OR REPLACE(COALESCE(g.codigo_guia, ''), '-', '') LIKE ?
        OR (substr(COALESCE(g.created_at, ''), 1, 4) || printf('%06d', g.id)) LIKE ?
        OR g.cpf LIKE ?
      )`);
      binds.push(like, guideDigitsLike, guideDigitsLike, `%${qDigits}%`);
    } else {
      where.push(`(LOWER(p.nome) LIKE LOWER(?) OR REPLACE(COALESCE(g.codigo_guia, ''), '-', '') LIKE ?)`);
      binds.push(like, guideDigitsLike || like);
    }
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const countRow = await env.DB_REGULACAO.prepare(`
    SELECT COUNT(*) AS total
    FROM guias g
    JOIN especialidades e ON e.id = g.especialidade_id
    JOIN pacientes p ON p.cpf = g.cpf
    ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);

  const orderSql = ordem === 'antigas' ? 'g.created_at ASC, g.id ASC' : 'g.created_at DESC, g.id DESC';
  const sql = `
    SELECT g.*, e.nome AS especialidade_nome, p.nome AS paciente_nome
    FROM guias g
    JOIN especialidades e ON e.id = g.especialidade_id
    JOIN pacientes p ON p.cpf = g.cpf
    ${whereSql}
    ORDER BY ${orderSql}
    LIMIT ? OFFSET ?`;

  const { results } = await env.DB_REGULACAO.prepare(sql).bind(...binds, pageSize, offset).all();
  return json({
    guias: results,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function onRequestPost({ request, env }) {
  const { user, access, error } = await requireRegulacaoCapability(
    request, env, 'cadastrante',
    'Seu usuário não possui responsabilidade de Cadastrante para emitir guias.'
  );
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

  const scope = await getRegulacaoScope(env, user, access);
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
  // O ano do identificador vem do próprio created_at gravado no banco.
  // Formato público: AAAA + ID com 6 dígitos, ex.: 2026000001.
  try {
    await env.DB_REGULACAO.prepare(`
      UPDATE guias
      SET codigo_guia = substr(created_at, 1, 4) || printf('%06d', id)
      WHERE id = ?
    `).bind(guiaId).run();
  } catch { /* base anterior ao reparo: o id continua válido */ }
  await logAudit(env, user, 'create', 'guia', guiaId, { cpf, especialidade_id });

  const guia = await env.DB_REGULACAO.prepare('SELECT * FROM guias WHERE id = ?').bind(guiaId).first();
  return json({ guia }, 201);
}
