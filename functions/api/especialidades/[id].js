import { json, logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'Especialidade inválida.' }, 400);
  const atual = await env.DB_REGULACAO.prepare('SELECT id, nome, ativo, sort_order, duracao_padrao_min FROM especialidades WHERE id = ?').bind(id).first();
  if (!atual) return json({ error: 'Especialidade não encontrada.' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const nome = body.nome == null ? atual.nome : String(body.nome).trim();
  const ativo = body.ativo == null ? Number(atual.ativo) : (body.ativo ? 1 : 0);
  const sortOrder = body.sort_order == null ? Number(atual.sort_order) : Number(body.sort_order);
  const duracao = body.duracao_padrao_min == null ? Number(atual.duracao_padrao_min || 30) : Number(body.duracao_padrao_min);
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 480) return json({ error: 'Duração padrão deve estar entre 5 e 480 minutos.' }, 400);
  if (!nome) return json({ error: 'Nome é obrigatório.' }, 400);

  const duplicada = await env.DB_REGULACAO.prepare('SELECT id FROM especialidades WHERE lower(nome) = lower(?) AND id != ?')
    .bind(nome, id).first();
  if (duplicada) return json({ error: 'Já existe outra especialidade com esse nome.' }, 409);

  await env.DB_REGULACAO.prepare('UPDATE especialidades SET nome = ?, ativo = ?, sort_order = ?, duracao_padrao_min = ? WHERE id = ?')
    .bind(nome, ativo, Number.isFinite(sortOrder) ? sortOrder : atual.sort_order, duracao, id).run();
  await logAudit(env, user, 'update', 'especialidade', id, { nome, ativo, sort_order: sortOrder });
  return json({ ok: true });
}
