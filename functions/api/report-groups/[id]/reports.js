import { json, requireAdmin } from '../../_utils.js';

// GET: lista todos os relatórios cadastrados + quais estão neste grupo.
export async function onRequestGet({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const { results: todos } = await env.DB.prepare(
    'SELECT id, title FROM reports ORDER BY sort_order ASC, title ASC'
  ).all();

  const { results: atribuidos } = await env.DB.prepare(
    'SELECT report_id FROM report_group_reports WHERE group_id = ?'
  ).bind(id).all();
  const atribuidosSet = new Set(atribuidos.map((r) => r.report_id));

  return json({
    reports: todos.map((r) => ({ ...r, atribuido: atribuidosSet.has(r.id) })),
  });
}

// PUT: substitui a lista de relatórios que este grupo pode ver.
// body: { reportIds: [1, 2, 3] }
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

  const reportIds = Array.isArray(body.reportIds) ? body.reportIds.map(Number).filter(Boolean) : [];

  await env.DB.prepare('DELETE FROM report_group_reports WHERE group_id = ?').bind(id).run();
  for (const reportId of reportIds) {
    await env.DB.prepare('INSERT INTO report_group_reports (group_id, report_id) VALUES (?, ?)')
      .bind(id, reportId)
      .run();
  }

  return json({ ok: true });
}
