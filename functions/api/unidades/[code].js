import { json, requireSuperAdmin, logAudit } from '../_utils.js';

// PUT: edita nome/CNES/endereço/telefone/status de uma unidade existente.
// O code é imutável (é a chave usada em user_unidades). Restrito ao Super
// Administrador.
// body: { nome, cnes, endereco, tel, ativo }
export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;

  const code = params.code;
  const existing = await env.DB.prepare('SELECT code FROM unidades WHERE code = ?').bind(code).first();
  if (!existing) return json({ error: 'Unidade não encontrada.' }, 404);

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
  const ativo = body.ativo === false ? 0 : 1;

  if (!nome) return json({ error: 'Informe o nome da unidade.' }, 400);

  await env.DB.prepare(
    'UPDATE unidades SET nome = ?, cnes = ?, endereco = ?, tel = ?, ativo = ? WHERE code = ?'
  )
    .bind(nome, cnes || null, endereco || null, tel || null, ativo, code)
    .run();

  await logAudit(env, user, 'update', 'unidade', code, `Unidade "${nome}" atualizada.`);

  return json({ ok: true });
}

// DELETE: remove definitivamente uma unidade do cadastro, junto com as
// atribuições que dependem dela (user_unidades). Restrito ao Super
// Administrador.
export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;

  const code = params.code;
  const existing = await env.DB.prepare('SELECT code, nome FROM unidades WHERE code = ?').bind(code).first();
  if (!existing) return json({ error: 'Unidade não encontrada.' }, 404);

  await env.DB.prepare('DELETE FROM user_unidades WHERE unidade_code = ?').bind(code).run();
  await env.DB.prepare('DELETE FROM unidades WHERE code = ?').bind(code).run();

  await logAudit(env, user, 'delete', 'unidade', code, `Unidade "${existing.nome}" excluída.`);

  return json({ ok: true });
}
