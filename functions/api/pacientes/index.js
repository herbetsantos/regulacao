// GET  /api/pacientes?cpf=... ou ?q=nome
// POST /api/pacientes

import { json, logAudit } from '../_utils.js';
import { requireRegulacaoAccess, requireRegulacaoCapability, isValidCPF, onlyDigits } from '../_shared.js';
import { getUnidadeAtivaComTipo, friendlyRegulacaoError } from '../_db.js';
import { normalizeAddressPayload, validateAddress, composeEndereco } from '../_address.js';
import {
  normalizeDemografia,
  validateDemografia,
  getPacienteColumns,
  requerMigrationDemografia,
  insertPaciente,
} from '../_paciente.js';

function configError(err) {
  const friendly = friendlyRegulacaoError(err);
  return json({ ...friendly, detalhe: String(err?.message || '') }, 503);
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const cpf = onlyDigits(url.searchParams.get('cpf') || '');
  const q = (url.searchParams.get('q') || '').trim();

  try {
    if (cpf) {
      const paciente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
      return json({ pacientes: paciente ? [paciente] : [] });
    }

    if (q) {
      const columns = await getPacienteColumns(env);
      const termo = `%${q}%`;
      const statement = columns.has('nome_social')
        ? "SELECT * FROM pacientes WHERE nome LIKE ? OR nome_social LIKE ? ORDER BY COALESCE(NULLIF(nome_social,''),nome) ASC LIMIT 25"
        : 'SELECT * FROM pacientes WHERE nome LIKE ? ORDER BY nome ASC LIMIT 25';
      const query = env.DB_REGULACAO.prepare(statement);
      const { results } = columns.has('nome_social')
        ? await query.bind(termo, termo).all()
        : await query.bind(termo).all();
      return json({ pacientes: results || [] });
    }

    return json({ pacientes: [] });
  } catch (err) {
    return configError(err);
  }
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireRegulacaoCapability(
    request, env, 'cadastrante',
    'Seu acesso permite consultar cidadãos, mas não cadastrar novos cidadãos.'
  );
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const cpf = onlyDigits(body.cpf);
  const cns = onlyDigits(body.cns) || null;
  const nome = String(body.nome || '').trim();
  const data_nascimento = String(body.data_nascimento || '').trim();
  const unidade_referencia_code = String(body.unidade_referencia_code || '').trim();
  const demografia = normalizeDemografia(body);
  const address = normalizeAddressPayload(body);
  const endereco = composeEndereco(address);
  const tel1 = onlyDigits(body.tel1) || null;
  const tel2 = onlyDigits(body.tel2) || null;
  const tel3 = onlyDigits(body.tel3) || null;

  if (!isValidCPF(cpf)) return json({ error: 'CPF inválido (deve ter 11 dígitos).' }, 400);
  if (cns && !/^\d{15}$/.test(cns)) return json({ error: 'CNS inválido (deve ter 15 dígitos).' }, 400);
  if (!nome) return json({ error: 'Nome é obrigatório.' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) return json({ error: 'Data de nascimento inválida.' }, 400);
  const demografiaError = validateDemografia(demografia);
  if (demografiaError) return json({ error: demografiaError }, 400);
  if (!unidade_referencia_code) return json({ error: 'Unidade de referência é obrigatória.' }, 400);
  const addressError = validateAddress(address);
  if (addressError) return json({ error: addressError }, 400);

  try {
    if (!env.DB_REGULACAO) {
      return json({
        error: 'O banco da Regulação não está vinculado ao projeto.',
        codigo: 'DB_REGULACAO_AUSENTE',
      }, 503);
    }

    const { unidade } = await getUnidadeAtivaComTipo(env, unidade_referencia_code);
    if (!unidade) return json({ error: 'Unidade de referência não encontrada.' }, 400);
    if (unidade.tipo !== 'aps') return json({ error: 'A unidade de referência deve ser uma unidade de Atenção Primária.' }, 400);

    const existente = await env.DB_REGULACAO.prepare('SELECT cpf FROM pacientes WHERE cpf = ?').bind(cpf).first();
    if (existente) return json({ error: 'Já existe um paciente cadastrado com esse CPF.' }, 409);

    const columns = await getPacienteColumns(env);
    if (requerMigrationDemografia(columns, demografia)) {
      return json({
        error: 'Os campos demográficos novos ainda não estão disponíveis neste banco. Aplique a migration 030.',
        codigo: 'REGULACAO_MIGRATION_030_PENDENTE',
      }, 503);
    }

    await insertPaciente(env, {
      cpf,
      cns,
      nome,
      nome_social: demografia.nome_social,
      data_nascimento,
      sexo: demografia.sexo,
      identidade_genero: demografia.identidade_genero,
      tel1,
      tel2,
      tel3,
      unidade_referencia_code,
      endereco,
      cep: address.cep,
      logradouro: address.logradouro,
      numero: address.numero,
      complemento: address.complemento,
      bairro: address.bairro,
      municipio: address.municipio,
      uf: address.uf,
    }, columns);

    await logAudit(env, user, 'create', 'paciente', cpf, { nome });
    const paciente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
    return json({ paciente }, 201);
  } catch (err) {
    return configError(err);
  }
}
