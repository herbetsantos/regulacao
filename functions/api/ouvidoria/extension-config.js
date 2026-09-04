import { json } from '../_utils.js';
import { extensionCorsHeaders, requireExtensionToken } from './_utils.js';

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: extensionCorsHeaders(request) });
}

export async function onRequestGet({ request, env }) {
  const headers = extensionCorsHeaders(request);
  const auth = requireExtensionToken(request, env);
  if (auth.error) return auth.error;

  const cfg = await env.DB.prepare(
    'SELECT confidence_threshold, versao, updated_at FROM ouvidoria_config WHERE id = 1'
  ).first();

  const { results: profissionais } = await env.DB.prepare(
    `SELECT codigo, nome, nome_ouvidorsus, email, observacao
       FROM ouvidoria_profissionais
      WHERE ativo = 1
      ORDER BY nome COLLATE NOCASE`
  ).all();

  const { results: regras } = await env.DB.prepare(
    `SELECT r.id, r.titulo, r.divisao, r.subtipo, r.descricao, r.prioridade,
            r.profissional_codigo
       FROM ouvidoria_regras r
       JOIN ouvidoria_profissionais p ON p.codigo = r.profissional_codigo
      WHERE r.ativo = 1 AND p.ativo = 1
      ORDER BY r.prioridade ASC, r.id ASC`
  ).all();

  const { results: fallback } = await env.DB.prepare(
    `SELECT f.ordem, f.profissional_codigo, p.nome, p.nome_ouvidorsus
       FROM ouvidoria_fallbacks f
       JOIN ouvidoria_profissionais p ON p.codigo = f.profissional_codigo
      WHERE f.ativo = 1 AND p.ativo = 1
      ORDER BY f.ordem ASC`
  ).all();

  return json({
    schemaVersion: 1,
    configVersion: cfg?.versao || 1,
    updatedAt: cfg?.updated_at || null,
    confidenceThreshold: Number(cfg?.confidence_threshold ?? 0.80),
    profissionais: (profissionais || []).map((p) => ({
      codigo: p.codigo,
      nome: p.nome,
      nomeOuvidorSus: p.nome_ouvidorsus || '',
      email: p.email || '',
      observacao: p.observacao || '',
    })),
    regras: (regras || []).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      divisao: r.divisao,
      subtipo: r.subtipo,
      descricao: r.descricao || '',
      prioridade: r.prioridade,
      profissionalCodigo: r.profissional_codigo,
    })),
    fallback: (fallback || []).map((f) => ({
      ordem: f.ordem,
      profissionalCodigo: f.profissional_codigo,
      nome: f.nome,
      nomeOuvidorSus: f.nome_ouvidorsus || '',
    })),
  }, 200, headers);
}
