// GET  /api/regulacao/especialidades  -> lista (ativas por padrão)
// POST /api/regulacao/especialidades  -> cadastra nova (admin/super_admin)

import { json, logAudit } from '../_utils.js';
import { requireRegulacaoAccess } from '../_shared.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const all = url.searchParams.get('all') === '1';
  const where = all ? '' : 'WHERE ativo = 1';
  const { results } = await env.DB_REGULACAO.prepare(
    `SELECT * FROM especialidades ${where} ORDER BY sort_order ASC, nome ASC`
  ).all();
  return json({ especialidades: results });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return json({ error: 'Apenas administradores podem cadastrar especialidades.' }, 403);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const nome = (body.nome || '').trim();
  if (!nome) return json({ error: 'Nome é obrigatório.' }, 400);

  const existente = await env.DB_REGULACAO.prepare('SELECT id FROM especialidades WHERE nome = ?').bind(nome).first();
  if (existente) return json({ error: 'Já existe uma especialidade com esse nome.' }, 409);

  const maxOrder = await env.DB_REGULACAO.prepare('SELECT MAX(sort_order) AS m FROM especialidades').first();
  const sort_order = (maxOrder?.m || 0) + 1;

  const result = await env.DB_REGULACAO.prepare(
    'INSERT INTO especialidades (nome, sort_order) VALUES (?, ?)'
  ).bind(nome, sort_order).run();

  await logAudit(env, user, 'create', 'especialidade', result.meta.last_row_id, { nome });

  return json({ id: result.meta.last_row_id, nome }, 201);
}
