import { json, requireAdmin } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

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

  await env.DB.prepare(
    'UPDATE reports SET title = ?, description = ?, embed_url = ?, display_mode = ?, sort_order = ? WHERE id = ?'
  )
    .bind(title, description || null, embedUrl, displayMode, sortOrder, id)
    .run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  await env.DB.prepare('DELETE FROM reports WHERE id = ?').bind(id).run();

  return json({ ok: true });
}
