import { json, requireAuth, requireAdmin, logAudit } from '../_utils.js';
import { isFeatureKey } from '../_permissions.js';

const CATEGORIES = ['ferramenta', 'documento', 'manual'];

export async function onRequestGet({ request, env }) {
  const { error } = await requireAuth(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const category = url.searchParams.get('category');

  const baseQuery = 'SELECT id, category, title, url, description, sort_order, feature_key, open_mode FROM links';
  const fallbackQuery = 'SELECT id, category, title, url, description, sort_order, open_mode FROM links';
  const suffix = category
    ? ' WHERE category = ? ORDER BY sort_order ASC, id ASC'
    : ' ORDER BY category ASC, sort_order ASC, id ASC';

  if (category && !CATEGORIES.includes(category)) return json({ error: 'Categoria inválida.' }, 400);

  let results;
  try {
    const stmt = category
      ? env.DB.prepare(baseQuery + suffix).bind(category)
      : env.DB.prepare(baseQuery + suffix);
    ({ results } = await stmt.all());
  } catch {
    // A migração database/migrations/legacy/migration_permissions.sql ainda não rodou (coluna feature_key
    // não existe) — cai pra consulta antiga, sem quebrar o menu Ferramentas
    // pra ninguém enquanto isso não é corrigido.
    const stmt = category
      ? env.DB.prepare(fallbackQuery + suffix).bind(category)
      : env.DB.prepare(fallbackQuery + suffix);
    ({ results } = await stmt.all());
    results = results.map((r) => ({ ...r, feature_key: null }));
  }

  return json({ links: results });
}

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const { category, title, url, description, sort_order, feature_key, open_mode } = body;
  if (!category || !CATEGORIES.includes(category)) return json({ error: 'Categoria inválida.' }, 400);
  if (!title || !title.trim()) return json({ error: 'Informe um título.' }, 400);
  if (!url || !url.trim()) return json({ error: 'Informe uma URL.' }, 400);
  if (feature_key && !isFeatureKey(feature_key)) return json({ error: 'Funcionalidade inválida.' }, 400);
  if (open_mode && !['_blank', '_self'].includes(open_mode)) return json({ error: 'Modo de abertura inválido.' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO links (category, title, url, description, sort_order, feature_key, open_mode) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(category, title.trim(), url.trim(), description ? description.trim() : null, sort_order || 0, feature_key || null, open_mode || '_blank')
    .run();

  await logAudit(env, user, 'create_link', 'link', result.meta.last_row_id, { category, title: title.trim(), url: url.trim() });

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}
