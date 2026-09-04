import { json, requireAdminPanel, requireSuperAdmin, logAudit } from '../_utils.js';
import { listUnidades, generateUnidadeCode } from '../_unidades.js';

// GET: lista todas as unidades cadastradas (inclusive inativas), para a tela
// Administração > Unidades e para os seletores de atribuição. Qualquer
// administrador (admin, super_admin, admin_unidade) pode consultar.
export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminPanel(request, env);
  if (error) return error;

  const unidades = await listUnidades(env);
  return json({ unidades });
}

// POST: cadastra uma nova unidade. Restrito ao Super Administrador.
// body: { nome, cnes, endereco, tel }
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const nome = (body.nome || '').trim();
  const cnes = (body.cnes || '').trim();
  const endereco = (body.endereco || '').trim();
  const tel = (body.tel || '').trim();

  if (!nome) return json({ error: 'Informe o nome da unidade.' }, 400);

  const code = await generateUnidadeCode(env, nome);

  const { results } = await env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM unidades'
  ).all();
  const nextOrder = (results[0]?.max_order || 0) + 1;

  await env.DB.prepare(
    'INSERT INTO unidades (code, nome, cnes, endereco, tel, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(code, nome, cnes || null, endereco || null, tel || null, nextOrder)
    .run();

  await logAudit(env, user, 'create', 'unidade', code, `Unidade "${nome}" cadastrada.`);

  return json({ ok: true, code }, 201);
}
