import { json, requireAdmin } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const { results } = await env.DB.prepare(
    'SELECT id, title, description, embed_url, display_mode, sort_order, created_at FROM reports ORDER BY sort_order ASC, title ASC'
  ).all();

  return json({ reports: results });
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

  const title = (body.title || '').trim();
  const description = (body.description || '').trim();
  const embedUrl = (body.embed_url || '').trim();
  const displayMode = body.display_mode === 'new_tab' ? 'new_tab' : 'embed';
  const sortOrder = Number(body.sort_order) || 0;

  if (!title) return json({ error: 'Informe o título do relatório.' }, 400);
  if (!embedUrl) return json({ error: 'Informe o link do relatório.' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO reports (title, description, embed_url, display_mode, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(title, description || null, embedUrl, displayMode, sortOrder)
    .run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}
