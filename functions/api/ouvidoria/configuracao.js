import { json, requireAdmin, logAudit } from '../_utils.js';
import { bumpOuvidoriaVersion } from './_utils.js';

async function readConfig(env) {
  const cfg = await env.DB.prepare(
    'SELECT confidence_threshold, versao, updated_at FROM ouvidoria_config WHERE id = 1'
  ).first();
  const { results } = await env.DB.prepare(
    `SELECT f.ordem, f.profissional_codigo, f.ativo, p.nome AS profissional_nome, p.nome_ouvidorsus
       FROM ouvidoria_fallbacks f
       LEFT JOIN ouvidoria_profissionais p ON p.codigo = f.profissional_codigo
      ORDER BY f.ordem`
  ).all();
  return { config: cfg || { confidence_threshold: 0.80, versao: 1 }, fallbacks: results || [] };
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;
  return json(await readConfig(env));
}

export async function onRequestPut({ request, env }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const threshold = Number(body.confidenceThreshold ?? body.confidence_threshold ?? 0.80);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    return json({ error: 'Limite de confiança deve ficar entre 0 e 1.' }, 400);
  }
  const fallbacks = Array.isArray(body.fallbacks) ? body.fallbacks : [];
  if (fallbacks.length > 10) return json({ error: 'Máximo de 10 fallbacks.' }, 400);

  const seen = new Set();
  for (const item of fallbacks) {
    const codigo = String(item.profissionalCodigo || item.profissional_codigo || '').trim();
    if (!codigo) return json({ error: 'Fallback sem profissional.' }, 400);
    if (seen.has(codigo)) return json({ error: 'O mesmo profissional não pode aparecer duas vezes no fallback.' }, 400);
    seen.add(codigo);
    const prof = await env.DB.prepare('SELECT codigo FROM ouvidoria_profissionais WHERE codigo = ?').bind(codigo).first();
    if (!prof) return json({ error: `Profissional ${codigo} não encontrado.` }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO ouvidoria_config (id, confidence_threshold, versao, updated_at)
     VALUES (1, ?, 1, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET confidence_threshold = excluded.confidence_threshold, updated_at = datetime('now')`
  ).bind(threshold).run();

  await env.DB.prepare('DELETE FROM ouvidoria_fallbacks').run();
  for (let i = 0; i < fallbacks.length; i++) {
    const codigo = String(fallbacks[i].profissionalCodigo || fallbacks[i].profissional_codigo || '').trim();
    await env.DB.prepare(
      'INSERT INTO ouvidoria_fallbacks (ordem, profissional_codigo, ativo, updated_at) VALUES (?, ?, 1, datetime(\'now\'))'
    ).bind(i + 1, codigo).run();
  }

  await bumpOuvidoriaVersion(env);
  await logAudit(env, user, 'update_ouvidoria_config', 'ouvidoria_config', '1', { confidenceThreshold: threshold, fallbacks: [...seen] });
  return json({ ok: true, ...(await readConfig(env)) });
}
