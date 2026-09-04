// GET  /api/pacientes?cpf=... ou ?q=nome
// POST /api/pacientes

import { json, logAudit } from '../_utils.js';
import { requireRegulacaoAccess, requireRegulacaoCapability, isValidCPF, onlyDigits } from '../_shared.js';
import { getUnidadeAtivaComTipo, friendlyRegulacaoError } from '../_db.js';
import { normalizeAddressPayload, validateAddress, composeEndereco, getPacienteEnderecoColumnStatus } from '../_address.js';

function configError(err) {
  const friendly = friendlyRegulacaoError(err);
  return json({
    ...friendly,
    detalhe: String(err?.message || ''),
  }, 503);
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
      const { results } = await env.DB_REGULACAO.prepare(
        'SELECT * FROM pacientes WHERE nome LIKE ? ORDER BY nome ASC LIMIT 25'
      ).bind(`%${q}%`).all();
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
  const nome = (body.nome || '').trim();
  const data_nascimento = (body.data_nascimento || '').trim();
  const sexo = body.sexo;
  const unidade_referencia_code = (body.unidade_referencia_code || '').trim();
  const address = normalizeAddressPayload(body);
  const endereco = composeEndereco(address);
  const tel1 = onlyDigits(body.tel1) || null;
  const tel2 = onlyDigits(body.tel2) || null;
  const tel3 = onlyDigits(body.tel3) || null;

  if (!isValidCPF(cpf)) return json({ error: 'CPF inválido (deve ter 11 dígitos).' }, 400);
  if (cns && !/^\d{15}$/.test(cns)) return json({ error: 'CNS inválido (deve ter 15 dígitos).' }, 400);
  if (!nome) return json({ error: 'Nome é obrigatório.' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) return json({ error: 'Data de nascimento inválida.' }, 400);
  if (!['F', 'M'].includes(sexo)) return json({ error: 'Sexo deve ser F ou M.' }, 400);
  if (!unidade_referencia_code) return json({ error: 'Unidade de referência é obrigatória.' }, 400);
  const addressError = validateAddress(address);
  if (addressError) return json({ error: addressError }, 400);

  try {
    const { unidade } = await getUnidadeAtivaComTipo(env, unidade_referencia_code);
    if (!unidade) return json({ error: 'Unidade de referência não encontrada.' }, 400);
    if (unidade.tipo !== 'aps') return json({ error: 'A unidade de referência deve ser uma unidade de Atenção Primária.' }, 400);

    if (!env.DB_REGULACAO) {
      return json({
        error: 'O banco da Regulação não está vinculado ao projeto. Configure o binding DB_REGULACAO no Cloudflare Pages.',
        codigo: 'DB_REGULACAO_AUSENTE',
      }, 503);
    }

    const existente = await env.DB_REGULACAO.prepare('SELECT cpf FROM pacientes WHERE cpf = ?').bind(cpf).first();
    if (existente) return json({ error: 'Já existe um paciente cadastrado com esse CPF.' }, 409);

    const enderecoColumns = await getPacienteEnderecoColumnStatus(env);
    const info = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
    const hasCns = (info.results || []).some((c) => c.name === 'cns');
    if (enderecoColumns.ok && hasCns) {
      await env.DB_REGULACAO.prepare(
        `INSERT INTO pacientes (
          cpf, cns, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco,
          cep, logradouro, numero, complemento, bairro, municipio, uf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        cpf, cns, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco,
        address.cep, address.logradouro, address.numero, address.complemento, address.bairro, address.municipio, address.uf
      ).run();
    } else if (enderecoColumns.ok) {
      await env.DB_REGULACAO.prepare(
        `INSERT INTO pacientes (
          cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco,
          cep, logradouro, numero, complemento, bairro, municipio, uf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco,
        address.cep, address.logradouro, address.numero, address.complemento, address.bairro, address.municipio, address.uf
      ).run();
    } else {
      // Compatibilidade com banco ainda não migrado: o endereço completo
      // continua salvo na coluna legada e o cadastro não é bloqueado.
      await env.DB_REGULACAO.prepare(
        `INSERT INTO pacientes (cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco).run();
    }

    await logAudit(env, user, 'create', 'paciente', cpf, { nome });
    const paciente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
    return json({ paciente }, 201);
  } catch (err) {
    return configError(err);
  }
}
