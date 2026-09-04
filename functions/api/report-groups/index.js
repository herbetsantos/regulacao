import { json, requireAdmin } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const { results } = await env.DB.prepare(
    'SELECT id, name, description, created_at FROM report_groups ORDER BY name ASC'
  ).all();

  return json({ groups: results });
}

export async function onRequestPost({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const name = (body.name || '').trim();
  const description = (body.description || '').trim();
  if (!name) return json({ error: 'Informe o nome do grupo.' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO report_groups (name, description) VALUES (?, ?)'
  )
    .bind(name, description || null)
    .run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}
