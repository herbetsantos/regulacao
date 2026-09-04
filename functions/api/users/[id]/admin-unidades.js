import { json, requireSuperAdmin } from '../../_utils.js';
import { listUnidades } from '../../_unidades.js';

// GET: lista as unidades cadastradas (mesma lista usada no Receituário) +
// quais estão atribuídas a este admin_unidade. Antes essa lista vinha dos
// valores livres já usados no campo "Unidade de lotação" de outros
// usuários; agora usa o cadastro canônico de unidades para evitar
// divergências de nome/grafia.
export async function onRequestGet({ request, env, params }) {
  const { error } = await requireSuperAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  const todas = await listUnidades(env, { onlyActive: true });

  const { results: atribuidas } = await env.DB.prepare(
    'SELECT unidade FROM admin_unidades WHERE admin_user_id = ?'
  ).bind(id).all();

  return json({
    unidades: todas.map((u) => u.nome),
    atribuidas: atribuidas.map((r) => r.unidade),
  });
}

// PUT: substitui a lista de unidades que este admin_unidade gerencia
// body: { unidades: ['UBS Jardim...', 'Secretaria', ...] }
export async function onRequestPut({ request, env, params }) {
  const { error } = await requireSuperAdmin(request, env);
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

  const unidades = Array.isArray(body.unidades)
    ? [...new Set(body.unidades.map((u) => String(u || '').trim()).filter(Boolean))]
    : [];

  await env.DB.prepare('DELETE FROM admin_unidades WHERE admin_user_id = ?').bind(id).run();
  for (const u of unidades) {
    await env.DB.prepare('INSERT INTO admin_unidades (admin_user_id, unidade) VALUES (?, ?)').bind(id, u).run();
  }

  return json({ ok: true, unidades });
}
