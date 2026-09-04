import { json, requireAdmin } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

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

  await env.DB.prepare(
    `UPDATE updates SET title = ?, body = ?, tag = ?, link_url = ?, link_label = ?, image_url = ?, image_alt = ?,
     published_at = COALESCE(NULLIF(?, ''), published_at)
     WHERE id = ?`
  )
    .bind(
      title.trim(),
      text.trim(),
      tag ? tag.trim() : null,
      link_url ? link_url.trim() : null,
      link_label ? link_label.trim() : null,
      imageValue || null,
      image_alt ? String(image_alt).trim() : null,
      published_at || '',
      id
    )
    .run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  await env.DB.prepare('DELETE FROM updates WHERE id = ?').bind(id).run();
  return json({ ok: true });
}