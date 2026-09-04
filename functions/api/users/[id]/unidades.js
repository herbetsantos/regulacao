import { json, requireAdmin } from '../../_utils.js';
import { listUnidades, isUnidadeCode } from '../../_unidades.js';

// GET: lista todas as unidades cadastradas (ativas) + quais estão atribuídas
// ao usuário. Mesma lista usada no seletor do Receituário (Administração >
// Unidades é quem cadastra novas).
export async function onRequestGet({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  const todas = await listUnidades(env, { onlyActive: true });

  const { results } = await env.DB.prepare(
    'SELECT unidade_code FROM user_unidades WHERE user_id = ?'
  )
    .bind(id)
    .all();
  const atribuidas = new Set(results.map((r) => r.unidade_code));

  return json({
    role: target.role,
    unidades: todas.map((u) => ({ ...u, atribuida: target.role === 'admin' || target.role === 'super_admin' || atribuidas.has(u.code) })),
  });
}

// PUT: substitui a lista de unidades atribuídas ao usuário
// body: { unidades: ['polvilho', 'upa', ...] }
export async function onRequestPut({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const unidades = Array.isArray(body.unidades) ? [...new Set(body.unidades)] : [];
  const validas = [];
  for (const code of unidades) {
    if (await isUnidadeCode(env, code)) validas.push(code);
  }

  await env.DB.prepare('DELETE FROM user_unidades WHERE user_id = ?').bind(id).run();

  for (const code of validas) {
    await env.DB.prepare(
      'INSERT INTO user_unidades (user_id, unidade_code) VALUES (?, ?)'
    )
      .bind(id, code)
      .run();
  }

  return json({ ok: true, unidades: validas });
}
