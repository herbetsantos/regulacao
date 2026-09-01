// GET /api/cep/:cep
// Proxy autenticado para a BrasilAPI. Mantém o front-end falando apenas com
// o domínio do eMulti e permite tratar indisponibilidades sem bloquear o
// cadastro manual do cidadão.

import { json } from '../_utils.js';
import { requireRegulacaoAccess, onlyDigits } from '../_shared.js';

const BRASIL_API_BASE = 'https://brasilapi.com.br/api/cep/v1/';

export async function onRequestGet({ request, params, env }) {
  const { error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const cep = onlyDigits(params.cep || '');
  if (!/^\d{8}$/.test(cep)) {
    return json({ error: 'CEP inválido. Informe 8 dígitos.' }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${BRASIL_API_BASE}${cep}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let data = null;
    try { data = await response.json(); } catch { data = null; }

    if (response.status === 404) {
      return json({ error: 'CEP não encontrado. Você pode preencher o endereço manualmente.' }, 404);
    }
    if (!response.ok) {
      return json({
        error: 'A consulta de CEP está temporariamente indisponível. Preencha o endereço manualmente e tente novamente depois.',
        codigo: 'BRASILAPI_INDISPONIVEL',
      }, 503);
    }

    return json({
      cep: onlyDigits(data?.cep || cep),
      logradouro: String(data?.street || '').trim(),
      bairro: String(data?.neighborhood || '').trim(),
      municipio: String(data?.city || '').trim(),
      uf: String(data?.state || '').trim().toUpperCase(),
      servico: data?.service || null,
    }, 200, {
      'Cache-Control': 'private, max-age=86400',
    });
  } catch (err) {
    const timeoutError = err?.name === 'AbortError';
    return json({
      error: timeoutError
        ? 'A consulta do CEP demorou mais que o esperado. Preencha o endereço manualmente.'
        : 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.',
      codigo: timeoutError ? 'BRASILAPI_TIMEOUT' : 'BRASILAPI_ERRO',
    }, 503);
  } finally {
    clearTimeout(timeout);
  }
}
