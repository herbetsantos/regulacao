import { json, requireAuth, requireAdmin } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireAuth(request, env);
  if (error) return error;

  const { results } = await env.DB.prepare(
    `SELECT id, title, body, tag, link_url, link_label, image_url, image_alt, published_at
     FROM updates ORDER BY published_at DESC, id DESC`
  ).all();

  return json({ updates: results });
}

export async function onRequestPost({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const { title, body: text, tag, link_url, link_label, image_url, image_alt, published_at } = body;
  if (!title || !title.trim()) return json({ error: 'Informe um título.' }, 400);
  if (!text || !text.trim()) return json({ error: 'Informe o texto do aviso.' }, 400);
  const imageValue = image_url ? String(image_url).trim() : '';
  if (imageValue && !/^(https:\/\/|\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(imageValue)) return json({ error: 'Imagem inválida. Use HTTPS, caminho local ou PNG/JPEG/WEBP/GIF.' }, 400);
  if (imageValue.length > 900000) return json({ error: 'Imagem muito grande.' }, 400);

  const result = await env.DB.prepare(
    `INSERT INTO updates (title, body, tag, link_url, link_label, image_url, image_alt, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?, ''), date('now')))`
  )
    .bind(
      title.trim(),
      text.trim(),
      tag ? tag.trim() : null,
      link_url ? link_url.trim() : null,
      link_label ? link_label.trim() : null,
      imageValue || null,
      image_alt ? String(image_alt).trim() : null,
      published_at || ''
    )
    .run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}