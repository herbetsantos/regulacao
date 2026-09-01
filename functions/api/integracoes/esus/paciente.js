// POST /api/integracoes/esus/paciente
// Recebe dados do cidadão extraídos da tela de Visualização do cadastro do
// e-SUS PEC pela extensão eSUS PEC → eMulti.
//
// Segurança:
// - usa a sessão normal do eMulti (nenhum token permanente na extensão);
// - exige responsabilidade Cadastrante/Administrador;
// - não aceita unidade que não seja APS;
// - se o CPF já existe, NÃO sobrescreve automaticamente o cadastro.

import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoCapability, isValidCPF, onlyDigits } from '../../_shared.js';
import { listUnidadesAtivasComTipo, getUnidadeAtivaComTipo, friendlyRegulacaoError } from '../../_db.js';
import { normalizeAddressPayload, validateAddress, composeEndereco, getPacienteEnderecoColumnStatus } from '../../_address.js';

function configError(err) {
  const friendly = friendlyRegulacaoError(err);
  return json({ ...friendly, detalhe: String(err?.message || '') }, 503);
}

function text(v) {
  return String(v ?? '').trim();
}

function normalizeName(v) {
  return text(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(cnes|codigo|cod)\b/g, ' ')
    .replace(/\s+-\s+\d{5,}$/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripCnesSuffix(v) {
  return text(v).replace(/\s+-\s+\d{5,}\s*$/, '').trim();
}

async function resolveUnidade(env, body) {
  const code = text(body.unidade_referencia_code);
  if (code) {
    const { unidade } = await getUnidadeAtivaComTipo(env, code);
    if (unidade?.tipo === 'aps') return { unidade, origem: 'codigo_informado' };
  }

  const { unidades } = await listUnidadesAtivasComTipo(env);
  const aps = (unidades || []).filter((u) => u.tipo === 'aps');
  const hints = [body.unidade_responsavel, body.unidade_saude]
    .map(stripCnesSuffix)
    .filter(Boolean);

  for (const hint of hints) {
    const nHint = normalizeName(hint);
    const exact = aps.filter((u) => normalizeName(u.nome) === nHint);
    if (exact.length === 1) return { unidade: exact[0], origem: 'nome_exato' };

    const partial = aps.filter((u) => {
      const n = normalizeName(u.nome);
      return n && nHint && (n.includes(nHint) || nHint.includes(n));
    });
    if (partial.length === 1) return { unidade: partial[0], origem: 'nome_aproximado' };
  }

  return {
    unidade: null,
    origem: null,
    aps: aps.map(({ code: c, nome }) => ({ code: c, nome })),
    hints,
  };
}

async function hasPacienteColumn(env, column) {
  const { results } = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
  return (results || []).some((c) => c.name === column);
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireRegulacaoCapability(
    request,
    env,
    'cadastrante',
    'Seu usuário não possui a responsabilidade Cadastrante no eMulti.'
  );
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const cpf = onlyDigits(body.cpf);
  const cns = onlyDigits(body.cns) || null;
  const nome = text(body.nome);
  const data_nascimento = text(body.data_nascimento);
  const sexo = text(body.sexo).toUpperCase();
  const tel1 = onlyDigits(body.tel1) || null;
  const tel2 = onlyDigits(body.tel2) || null;
  const tel3 = onlyDigits(body.tel3) || null;
  const address = normalizeAddressPayload(body);
  const endereco = composeEndereco(address);

  if (!isValidCPF(cpf)) {
    return json({ error: 'O cidadão do PEC não possui CPF válido com 11 dígitos.', codigo: 'CPF_INVALIDO_OU_AUSENTE' }, 400);
  }
  if (!nome) return json({ error: 'Nome do cidadão não encontrado no PEC.' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) {
    return json({ error: 'Data de nascimento inválida ou não encontrada no PEC.' }, 400);
  }
  if (!['F', 'M'].includes(sexo)) {
    return json({ error: 'Sexo inválido ou não encontrado no PEC.' }, 400);
  }
  if (cns && !/^\d{15}$/.test(cns)) {
    return json({ error: 'CNS inválido. O CNS deve possuir 15 dígitos.' }, 400);
  }
  const addressError = validateAddress(address);
  if (addressError) return json({ error: addressError }, 400);

  try {
    if (!env.DB_REGULACAO) {
      return json({
        error: 'O banco da Regulação não está vinculado ao projeto.',
        codigo: 'DB_REGULACAO_AUSENTE',
      }, 503);
    }

    const existente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
    if (existente) {
      await logAudit(env, user, 'read', 'paciente_integracao_esus', cpf, {
        origem: 'esus_pec',
        resultado: 'ja_existente',
        pec_cidadao_id: text(body.pec_cidadao_id) || null,
      });
      return json({
        status: 'existente',
        mensagem: 'O cidadão já está cadastrado na Regulação.',
        paciente: existente,
        guia_url: `/guia-nova.html?cpf=${cpf}`,
      });
    }

    const resolved = await resolveUnidade(env, body);
    if (!resolved.unidade) {
      return json({
        error: 'Não foi possível relacionar automaticamente a unidade de referência do PEC a uma APS do eMulti.',
        codigo: 'UNIDADE_REFERENCIA_NAO_IDENTIFICADA',
        unidade_recebida: resolved.hints?.[0] || resolved.hints?.[1] || null,
        unidades_aps: resolved.aps || [],
      }, 422);
    }

    const enderecoColumns = await getPacienteEnderecoColumnStatus(env);
    const hasCns = await hasPacienteColumn(env, 'cns');

    if (enderecoColumns.ok && hasCns) {
      await env.DB_REGULACAO.prepare(
        `INSERT INTO pacientes (
          cpf, cns, nome, data_nascimento, sexo, tel1, tel2, tel3,
          unidade_referencia_code, endereco, cep, logradouro, numero,
          complemento, bairro, municipio, uf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        cpf, cns, nome, data_nascimento, sexo, tel1, tel2, tel3,
        resolved.unidade.code, endereco, address.cep, address.logradouro,
        address.numero, address.complemento, address.bairro, address.municipio, address.uf
      ).run();
    } else if (enderecoColumns.ok) {
      await env.DB_REGULACAO.prepare(
        `INSERT INTO pacientes (
          cpf, nome, data_nascimento, sexo, tel1, tel2, tel3,
          unidade_referencia_code, endereco, cep, logradouro, numero,
          complemento, bairro, municipio, uf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        cpf, nome, data_nascimento, sexo, tel1, tel2, tel3,
        resolved.unidade.code, endereco, address.cep, address.logradouro,
        address.numero, address.complemento, address.bairro, address.municipio, address.uf
      ).run();
    } else {
      await env.DB_REGULACAO.prepare(
        `INSERT INTO pacientes (cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, unidade_referencia_code, endereco)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(cpf, nome, data_nascimento, sexo, tel1, tel2, tel3, resolved.unidade.code, endereco).run();
    }

    await logAudit(env, user, 'create', 'paciente_integracao_esus', cpf, {
      origem: 'esus_pec',
      nome,
      unidade_code: resolved.unidade.code,
      unidade_resolvida_por: resolved.origem,
      pec_cidadao_id: text(body.pec_cidadao_id) || null,
    });

    const paciente = await env.DB_REGULACAO.prepare('SELECT * FROM pacientes WHERE cpf = ?').bind(cpf).first();
    return json({
      status: 'criado',
      mensagem: 'Cidadão cadastrado na Regulação a partir do e-SUS PEC.',
      paciente,
      unidade: { code: resolved.unidade.code, nome: resolved.unidade.nome },
      guia_url: `/guia-nova.html?cpf=${cpf}`,
    }, 201);
  } catch (err) {
    return configError(err);
  }
}
