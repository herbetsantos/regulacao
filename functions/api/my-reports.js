import { json, requireAuth } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const { user, error } = await requireAuth(request, env);
  if (error) return error;

  if (user.role === 'admin' || user.role === 'super_admin') {
    const { results } = await env.DB.prepare(
      'SELECT id, title, description, embed_url, display_mode FROM reports ORDER BY sort_order ASC, title ASC'
    ).all();
    return json({ reports: results });
  }

  const { results } = await env.DB.prepare(
    `SELECT DISTINCT r.id, r.title, r.description, r.embed_url, r.display_mode, r.sort_order
     FROM reports r
     JOIN report_group_reports rgr ON rgr.report_id = r.id
     JOIN user_report_groups urg ON urg.group_id = rgr.group_id
     WHERE urg.user_id = ?
     ORDER BY r.sort_order ASC, r.title ASC`
  ).bind(user.id).all();

  return json({ reports: results });
}
