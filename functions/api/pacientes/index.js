// GET  /api/regulacao/pacientes?cpf=... ou ?q=nome  -> busca
// POST /api/regulacao/pacientes                     -> cadastra

import { json, logAudit } from '../_utils.js';
import { requireRegulacaoAccess, isValidCPF, onlyDigits } from '../_shared.js';

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const cpf = onlyDigits(url.searchParams.get('cpf') || '');
  const q = (url.searchParams.get('q') || '').trim();

  if (cpf) {
    const paciente = await env.DB_REGULACAO.prepare(
      'SELECT * FROM pacientes WHERE cpf = ?'
    ).bind(cpf).first();
    return json({ pacientes: paciente ? [paciente] : [] });
  }

  if (q) {
    const { results } = await env.DB_REGULACAO.prepare(
      `SELECT * FROM pacientes WHERE nome LIKE ? ORDER BY nome ASC LIMIT 25`
    ).bind(`%${q}%`).all();
    return json({ pacientes: results });
  }

  return json({ pacientes: [] });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const cpf = onlyDigits(body.cpf);
  const nome = (body.nome || '').trim();
  const data_nascimento = (body.data_nascimento || '').trim();
  const sexo = body.sexo;
  const unidade_referencia_code = (body.unidade_referencia_code || '').trim();
  const endereco = (body.endereco || '').trim() || null;
  const tel1 = onlyDigits(body.tel1) || null;
  const tel2 = onlyDigits(body.tel2) || null;
  const tel3 = onlyDigits(body.tel3) || null;

  if (!isValidCPF(cpf)) return json({ error: 'CPF inválido (deve ter 11 dígitos).' }, 400);
  if (!nome) return json({ error: 'Nome é obrigatório.' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) return json({ error: 'Data de nascimento inválida.' }, 400);
  if (!['F', 'M'].includes(sexo)) return json({ error: 'Sexo deve ser F ou M.' }, 400);
  if (!unidade_referencia_code) return json({ error: 'Unidade de referência é obrigatória.' }, 400);

  // Confere que a unidade de referência existe e é mesmo uma unidade APS.
  const unidade = await env.DB.prepare(
    "SELECT code, tipo FROM unidades WHERE code = ? AND ativo = 1"
  ).bind(unidade_referencia_code).first();
  if (!unidade) return json({ error: 'Unidade de referência não encontrada.' }, 400);
  if (unidade.tipo !== 'aps') {
    return json({ error: 'A unidade de referência deve ser uma unidade de Atenção Primária.' }, 400);
  }

  const existente = await env.DB_REGULACAO.prepare('SELECT cpf FROM pacientes WHERE cpf = ?').bind(cpf).first();
  if (existente) return json({ error: 'Já existe um paciente cadastrado com esse CPF.' }, 409);

  await env.DB_REGULACAO.prepare(
    `INSERT INTO pacientes (cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco).run();

  await logAudit(env, user, 'create', 'paciente', cpf, { nome });

  const paciente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
  return json({ paciente }, 201);
}
