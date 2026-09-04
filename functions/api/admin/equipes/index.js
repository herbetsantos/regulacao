// GET  /api/admin/equipes -> todas as equipes (ativas e inativas), com
//      unidades e profissionais completos
// POST /api/admin/equipes -> cria nova equipe { nome }

import { json, logAudit } from '../../_utils.js';
import { requireAdminAccess } from '../../_shared.js';
import { getEquipeProfissionais, ensureProfissionalSchema } from '../../_professionals.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;

  await ensureProfissionalSchema(env);

  const { results: equipes } = await env.DB.prepare(
    'SELECT id, nome, ativo FROM regulacao_equipes ORDER BY nome ASC'
  ).all();

  const detalhadas = [];
  for (const eq of equipes) {
    const { results: unidades } = await env.DB.prepare(
      `SELECT u.code, u.nome FROM regulacao_equipe_unidades eu
       JOIN unidades u ON u.code = eu.unidade_code
       WHERE eu.equipe_id = ? ORDER BY u.nome`
    ).bind(eq.id).all();
    const profissionais = await getEquipeProfissionais(env, eq.id);
    detalhadas.push({ ...eq, unidades, profissionais });
  }

  return json({ equipes: detalhadas });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const nome = (body.nome || '').trim();
  if (!nome) return json({ error: 'Nome da equipe é obrigatório.' }, 400);

  const existente = await env.DB.prepare('SELECT id FROM regulacao_equipes WHERE nome = ?').bind(nome).first();
  if (existente) return json({ error: 'Já existe uma equipe com esse nome.' }, 409);

  const result = await env.DB.prepare('INSERT INTO regulacao_equipes (nome) VALUES (?)').bind(nome).run();
  await logAudit(env, user, 'create', 'equipe', result.meta.last_row_id, { nome });

  return json({ id: result.meta.last_row_id, nome, ativo: 1, unidades: [], profissionais: [] }, 201);
}
