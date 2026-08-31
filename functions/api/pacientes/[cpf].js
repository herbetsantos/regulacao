// GET /api/pacientes/:cpf -> dados do paciente + histórico de guias
// PUT /api/pacientes/:cpf -> atualiza cadastro

import { json, logAudit } from '../_utils.js';
import { requireRegulacaoAccess, onlyDigits } from '../_shared.js';
import { getUnidadeAtivaComTipo, friendlyRegulacaoError } from '../_db.js';

function configError(err) {
  const friendly = friendlyRegulacaoError(err);
  return json({ ...friendly, detalhe: String(err?.message || '') }, 503);
}

export async function onRequestGet({ request, env, params }) {
  const { error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  try {
    const cpf = onlyDigits(params.cpf);
    const paciente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
    if (!paciente) return json({ error: 'Paciente não encontrado.' }, 404);

    const { results: guias } = await env.DB_REGULACAO.prepare(
      `SELECT g.*, e.nome AS especialidade_nome
       FROM guias g JOIN especialidades e ON e.id = g.especialidade_id
       WHERE g.cpf = ? ORDER BY g.created_at DESC`
    ).bind(cpf).all();

    return json({ paciente, guias: guias || [] });
  } catch (err) {
    return configError(err);
  }
}

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  try {
    const cpf = onlyDigits(params.cpf);
    const existente = await env.DB_REGULACAO.prepare('SELECT cpf FROM pacientes WHERE cpf = ?').bind(cpf).first();
    if (!existente) return json({ error: 'Paciente não encontrado.' }, 404);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

    const nome = (body.nome || '').trim();
    const data_nascimento = (body.data_nascimento || '').trim();
    const sexo = body.sexo;
    const unidade_referencia_code = (body.unidade_referencia_code || '').trim();
    const endereco = (body.endereco || '').trim() || null;
    const tel1 = onlyDigits(body.tel1) || null;
    const tel2 = onlyDigits(body.tel2) || null;
    const tel3 = onlyDigits(body.tel3) || null;

    if (!nome) return json({ error: 'Nome é obrigatório.' }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) return json({ error: 'Data de nascimento inválida.' }, 400);
    if (!['F', 'M'].includes(sexo)) return json({ error: 'Sexo deve ser F ou M.' }, 400);
    if (!unidade_referencia_code) return json({ error: 'Unidade de referência é obrigatória.' }, 400);

    const { unidade } = await getUnidadeAtivaComTipo(env, unidade_referencia_code);
    if (!unidade) return json({ error: 'Unidade de referência não encontrada.' }, 400);
    if (unidade.tipo !== 'aps') {
      return json({ error: 'A unidade de referência deve ser uma unidade de Atenção Primária.' }, 400);
    }

    await env.DB_REGULACAO.prepare(
      `UPDATE pacientes SET nome=?, data_nascimento=?, sexo=?, tel1=?, tel2=?, tel3=?,
       unidade_referencia_code=?, endereco=?, updated_at=datetime('now') WHERE cpf=?`
    ).bind(nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco, cpf).run();

    await logAudit(env, user, 'update', 'paciente', cpf, { nome });

    const paciente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
    return json({ paciente });
  } catch (err) {
    return configError(err);
  }
}
