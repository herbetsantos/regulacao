import { onlyDigits } from './_shared.js';

export const PACIENTE_ENDERECO_COLUMNS = [
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'municipio',
  'uf',
];

export function normalizeAddressPayload(body = {}) {
  const cep = onlyDigits(body.cep || '');
  const logradouro = String(body.logradouro || '').trim();
  const numero = String(body.numero || '').trim();
  const complemento = String(body.complemento || '').trim();
  const bairro = String(body.bairro || '').trim();
  const municipio = String(body.municipio || '').trim();
  const uf = String(body.uf || '').trim().toUpperCase();
  const enderecoLegado = String(body.endereco || '').trim();

  return {
    cep: cep || null,
    logradouro: logradouro || null,
    numero: numero || null,
    complemento: complemento || null,
    bairro: bairro || null,
    municipio: municipio || null,
    uf: uf || null,
    enderecoLegado: enderecoLegado || null,
  };
}

export function validateAddress(address) {
  if (address.cep && !/^\d{8}$/.test(address.cep)) {
    return 'CEP inválido. Informe 8 dígitos.';
  }
  if (address.uf && !/^[A-Z]{2}$/.test(address.uf)) {
    return 'UF inválida. Informe a sigla com 2 letras.';
  }
  return null;
}

export function composeEndereco(address) {
  if (address.enderecoLegado && !address.logradouro && !address.bairro && !address.municipio) {
    return address.enderecoLegado;
  }

  const linha1 = [address.logradouro, address.numero].filter(Boolean).join(', ');
  const partes = [linha1 || null, address.complemento, address.bairro].filter(Boolean);
  let localidade = [address.municipio, address.uf].filter(Boolean).join(' - ');
  if (address.cep) localidade = [localidade || null, `CEP ${address.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}`].filter(Boolean).join(' · ');
  if (localidade) partes.push(localidade);

  return partes.join(' · ') || address.enderecoLegado || null;
}

export async function getPacienteEnderecoColumnStatus(env) {
  const { results } = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
  const existentes = new Set((results || []).map((c) => c.name));
  const faltantes = PACIENTE_ENDERECO_COLUMNS.filter((c) => !existentes.has(c));
  return {
    ok: faltantes.length === 0,
    faltantes,
    existentes,
  };
}
