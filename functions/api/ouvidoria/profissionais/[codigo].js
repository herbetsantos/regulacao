import { json, requireAdmin, logAudit } from '../../_utils.js';
import { bumpOuvidoriaVersion, parseActive, validEmail } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  const codigo = params.codigo;
  const existing = await env.DB.prepare('SELECT * FROM ouvidoria_profissionais WHERE codigo = ?').bind(codigo).first();
  if (!existing) return json({ error: 'Profissional não encontrado.' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }
  const nome = String(body.nome ?? existing.nome ?? '').trim();
  const nomeOuvidorSus = String(body.nomeOuvidorSus ?? body.nome_ouvidorsus ?? existing.nome_ouvidorsus ?? '').trim();
  const email = String(body.email ?? existing.email ?? '').trim().toLowerCase();
  const observacao = String(body.observacao ?? existing.observacao ?? '').trim();
  const ativo = body.hasOwnProperty('ativo') ? parseActive(body.ativo, true) : existing.ativo;

  if (!nome) return json({ error: 'Informe o nome do profissional.' }, 400);
  if (!validEmail(email)) return json({ error: 'E-mail inválido.' }, 400);

  await env.DB.prepare(
    `UPDATE ouvidoria_profissionais
     SET nome = ?, nome_ouvidorsus = ?, email = ?, ativo = ?, observacao = ?, updated_at = datetime('now')
     WHERE codigo = ?`
  ).bind(nome, nomeOuvidorSus || null, email || null, ativo, observacao || null, codigo).run();

  await bumpOuvidoriaVersion(env);
  await logAudit(env, user, 'update_ouvidoria_profissional', 'ouvidoria_profissional', codigo, { nome, ativo: !!ativo });
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  const codigo = params.codigo;
  const existing = await env.DB.prepare('SELECT codigo, nome FROM ouvidoria_profissionais WHERE codigo = ?').bind(codigo).first();
  if (!existing) return json({ error: 'Profissional não encontrado.' }, 404);

  const rule = await env.DB.prepare('SELECT id FROM ouvidoria_regras WHERE profissional_codigo = ? LIMIT 1').bind(codigo).first();
  const fallback = await env.DB.prepare('SELECT ordem FROM ouvidoria_fallbacks WHERE profissional_codigo = ? LIMIT 1').bind(codigo).first();
  if (rule || fallback) {
    return json({ error: 'Esse profissional ainda está vinculado a regra ou fallback. Desative-o ou remova os vínculos antes da exclusão definitiva.' }, 409);
  }

  await env.DB.prepare('DELETE FROM ouvidoria_profissionais WHERE codigo = ?').bind(codigo).run();
  await bumpOuvidoriaVersion(env);
  await logAudit(env, user, 'delete_ouvidoria_profissional', 'ouvidoria_profissional', codigo, { nome: existing.nome });
  return json({ ok: true });
}
