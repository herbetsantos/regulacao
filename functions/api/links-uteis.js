import { json } from './_utils.js';
import { requireRegulacaoAccess } from './_shared.js';

const DEFAULT_ICON = {
  ferramenta: 'tools',
  documento: 'document',
  manual: 'book',
};

export async function onRequestGet({ request, env }) {
  const { error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  let results;
  try {
    ({ results } = await env.DB.prepare(
      `SELECT l.id, l.category, l.title, l.url, l.description, l.sort_order, l.open_mode,
              COALESCE(i.icon_key, '') AS icon_key
       FROM links l
       LEFT JOIN regulacao_link_icons i ON i.link_id = l.id
       WHERE l.category IN ('ferramenta','documento','manual')
       ORDER BY l.category, l.sort_order ASC, l.id ASC`
    ).all());
  } catch {
    // Compatibilidade enquanto a migração de ícones ainda não tiver sido rodada.
    ({ results } = await env.DB.prepare(
      `SELECT id, category, title, url, description, sort_order, open_mode
       FROM links
       WHERE category IN ('ferramenta','documento','manual')
       ORDER BY category, sort_order ASC, id ASC`
    ).all());
    results = results.map((r) => ({ ...r, icon_key: '' }));
  }

  const links = results
    .filter((l) => String(l.title || '').toLowerCase() !== 'regulação de vagas')
    .map((l) => ({ ...l, icon_key: l.icon_key || DEFAULT_ICON[l.category] || 'links' }));

  return json({ links });
}
