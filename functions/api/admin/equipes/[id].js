import { json, logAudit } from '../../_utils.js';
import { requireAdminAccess } from '../../_shared.js';
import { syncPortalRegulacaoFeature } from '../../_permissions.js';

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  const equipeId = Number(params.id);
  if (!equipeId) return json({ error: 'Equipe inválida.' }, 400);
  const atual = await env.DB.prepare('SELECT id, nome, ativo FROM regulacao_equipes WHERE id = ?').bind(equipeId).first();
  if (!atual) return json({ error: 'Equipe não encontrada.' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const nome = body.nome == null ? atual.nome : String(body.nome).trim();
  const ativo = body.ativo == null ? Number(atual.ativo) : (body.ativo ? 1 : 0);
  if (!nome) return json({ error: 'Nome da equipe é obrigatório.' }, 400);

  const duplicada = await env.DB.prepare('SELECT id FROM regulacao_equipes WHERE lower(nome) = lower(?) AND id != ?')
    .bind(nome, equipeId).first();
  if (duplicada) return json({ error: 'Já existe outra equipe com esse nome.' }, 409);

  await env.DB.prepare('UPDATE regulacao_equipes SET nome = ?, ativo = ? WHERE id = ?')
    .bind(nome, ativo, equipeId).run();

  // Ativar/desativar uma equipe muda a validade do vínculo que concede acesso.
  // Recalcula o link do eMulti no Portal para todos os profissionais vinculados.
  if (Number(atual.ativo) !== ativo) {
    const { results: membros } = await env.DB.prepare(
      'SELECT user_id FROM regulacao_equipe_profissionais WHERE equipe_id = ?'
    ).bind(equipeId).all();
    for (const membro of (membros || [])) {
      await syncPortalRegulacaoFeature(env, Number(membro.user_id));
    }
  }

  await logAudit(env, user, 'update', 'equipe', equipeId, { nome, ativo });
  return json({ ok: true, equipe: { id: equipeId, nome, ativo } });
}
