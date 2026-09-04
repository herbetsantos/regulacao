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

  const name = (body.name || '').trim();
  const description = (body.description || '').trim();
  if (!name) return json({ error: 'Informe o nome do grupo.' }, 400);

  await env.DB.prepare('UPDATE report_groups SET name = ?, description = ? WHERE id = ?')
    .bind(name, description || null, id)
    .run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  await env.DB.prepare('DELETE FROM report_groups WHERE id = ?').bind(id).run();

  return json({ ok: true });
}
