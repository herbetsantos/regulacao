import { json, requireAdmin, logAudit } from '../../_utils.js';
import { bumpOuvidoriaVersion, parseActive } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.titulo, r.divisao, r.subtipo, r.descricao, r.prioridade,
            r.profissional_codigo, r.ativo, r.created_at, r.updated_at,
            p.nome AS profissional_nome, p.ativo AS profissional_ativo
       FROM ouvidoria_regras r
       LEFT JOIN ouvidoria_profissionais p ON p.codigo = r.profissional_codigo
      ORDER BY r.ativo DESC, r.prioridade ASC, r.id ASC`
  ).all();
  return json({ regras: results });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const titulo = String(body.titulo || '').trim();
  const divisao = String(body.divisao || '').trim();
  const subtipo = String(body.subtipo || 'geral').trim().toLowerCase();
  const descricao = String(body.descricao || '').trim();
  const prioridade = Number.isFinite(Number(body.prioridade)) ? Math.trunc(Number(body.prioridade)) : 100;
  const profissionalCodigo = String(body.profissionalCodigo || body.profissional_codigo || '').trim();
  const ativo = parseActive(body.ativo, true);

  if (!titulo) return json({ error: 'Informe um título para a regra.' }, 400);
  if (!divisao) return json({ error: 'Informe a divisão.' }, 400);
  if (!profissionalCodigo) return json({ error: 'Selecione o responsável.' }, 400);
  if (prioridade < 1 || prioridade > 9999) return json({ error: 'Prioridade deve ficar entre 1 e 9999.' }, 400);

  const prof = await env.DB.prepare('SELECT codigo FROM ouvidoria_profissionais WHERE codigo = ?').bind(profissionalCodigo).first();
  if (!prof) return json({ error: 'Profissional não encontrado.' }, 400);

  const result = await env.DB.prepare(
    `INSERT INTO ouvidoria_regras (titulo, divisao, subtipo, descricao, prioridade, profissional_codigo, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(titulo, divisao, subtipo || 'geral', descricao || null, prioridade, profissionalCodigo, ativo).run();

  await bumpOuvidoriaVersion(env);
  await logAudit(env, user, 'create_ouvidoria_regra', 'ouvidoria_regra', result.meta?.last_row_id, { titulo, profissionalCodigo });
  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}
