import { json, logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';

const ICON_KEYS = new Set([
  'links','document','book','tools','calendar','message','hospital','chart',
  'patients','queue','info','external'
]);

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;

  let results;
  try {
    ({ results } = await env.DB.prepare(
      `SELECT l.id, l.category, l.title, l.url, l.description, l.sort_order,
              COALESCE(i.icon_key, '') AS icon_key
       FROM links l
       LEFT JOIN regulacao_link_icons i ON i.link_id = l.id
       WHERE l.category IN ('ferramenta','documento','manual')
       ORDER BY l.category, l.sort_order ASC, l.id ASC`
    ).all());
  } catch {
    return json({ error: 'A tabela de ícones ainda não existe. Rode a migração_regulacao_v2.sql no banco do Portal.' }, 503);
  }

  return json({ links: results });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const linkId = Number(body.link_id);
  const iconKey = String(body.icon_key || '').trim();

  if (!linkId) return json({ error: 'Informe o link.' }, 400);
  if (!ICON_KEYS.has(iconKey)) return json({ error: 'Ícone inválido.' }, 400);

  const link = await env.DB.prepare('SELECT id, title FROM links WHERE id = ?').bind(linkId).first();
  if (!link) return json({ error: 'Link não encontrado.' }, 404);

  await env.DB.prepare(
    `INSERT INTO regulacao_link_icons (link_id, icon_key, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(link_id) DO UPDATE SET icon_key = excluded.icon_key, updated_at = datetime('now')`
  ).bind(linkId, iconKey).run();

  await logAudit(env, user, 'update', 'regulacao_link_icon', linkId, { iconKey, title: link.title });
  return json({ ok: true });
}
