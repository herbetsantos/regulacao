import { json, requireAdminPanel, getAdminUnidades } from '../../_utils.js';

// GET: lista todos os grupos de acesso + quais estão atribuídos ao usuário.
export async function onRequestGet({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (target.role !== 'user' || !target.unidade || !minhas.includes(target.unidade.toLowerCase())) {
      return json({ error: 'Você só pode gerenciar usuários das unidades sob sua gestão.' }, 403);
    }
  }

  const { results: todos } = await env.DB.prepare(
    'SELECT id, name, description FROM report_groups ORDER BY name ASC'
  ).all();

  const { results: atribuidos } = await env.DB.prepare(
    'SELECT group_id FROM user_report_groups WHERE user_id = ?'
  ).bind(id).all();
  const atribuidosSet = new Set(atribuidos.map((r) => r.group_id));

  return json({
    role: target.role,
    groups: todos.map((g) => ({ ...g, atribuido: target.role === 'admin' || target.role === 'super_admin' || atribuidosSet.has(g.id) })),
  });
}

// PUT: substitui a lista de grupos de acesso do usuário.
// body: { groupIds: [1, 2, 3] }
export async function onRequestPut({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (target.role !== 'user' || !target.unidade || !minhas.includes(target.unidade.toLowerCase())) {
      return json({ error: 'Você só pode gerenciar usuários das unidades sob sua gestão.' }, 403);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const groupIds = Array.isArray(body.groupIds) ? body.groupIds.map(Number).filter(Boolean) : [];

  await env.DB.prepare('DELETE FROM user_report_groups WHERE user_id = ?').bind(id).run();
  for (const groupId of groupIds) {
    await env.DB.prepare('INSERT INTO user_report_groups (user_id, group_id) VALUES (?, ?)')
      .bind(id, groupId)
      .run();
  }

  return json({ ok: true });
}
