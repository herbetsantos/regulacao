import { json, requireAdmin, logAudit } from '../../_utils.js';
import { normalizeOuvidoriaCode, bumpOuvidoriaVersion, parseActive, validEmail } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;
  const { results } = await env.DB.prepare(
    `SELECT codigo, nome, nome_ouvidorsus, email, ativo, observacao, created_at, updated_at
     FROM ouvidoria_profissionais ORDER BY ativo DESC, nome COLLATE NOCASE`
  ).all();
  return json({ profissionais: results });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const codigo = normalizeOuvidoriaCode(body.codigo || body.nome);
  const nome = String(body.nome || '').trim();
  const nomeOuvidorSus = String(body.nomeOuvidorSus || body.nome_ouvidorsus || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const observacao = String(body.observacao || '').trim();
  const ativo = parseActive(body.ativo, true);

  if (!codigo || codigo.length < 2) return json({ error: 'Informe um código técnico válido.' }, 400);
  if (!nome) return json({ error: 'Informe o nome do profissional.' }, 400);
  if (!validEmail(email)) return json({ error: 'E-mail inválido.' }, 400);

  const exists = await env.DB.prepare('SELECT codigo FROM ouvidoria_profissionais WHERE codigo = ?').bind(codigo).first();
  if (exists) return json({ error: 'Já existe um profissional com esse código.' }, 409);

  await env.DB.prepare(
    `INSERT INTO ouvidoria_profissionais (codigo, nome, nome_ouvidorsus, email, ativo, observacao)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(codigo, nome, nomeOuvidorSus || null, email || null, ativo, observacao || null).run();

  await bumpOuvidoriaVersion(env);
  await logAudit(env, user, 'create_ouvidoria_profissional', 'ouvidoria_profissional', codigo, { nome });
  return json({ ok: true, codigo }, 201);
}
