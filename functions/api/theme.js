import { json, getAuthUser } from './_utils.js';

const ALLOWED_THEMES = new Set(['auto', 'light', 'dark', 'contrast']);

async function getTheme(env, userId) {
  const row = await env.DB.prepare('SELECT theme FROM users WHERE id = ?').bind(userId).first();
  return ALLOWED_THEMES.has(row?.theme) ? row.theme : 'light';
}

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);
  try {
    return json({ theme: await getTheme(env, user.id) });
  } catch {
    // Nunca transforma uma falha de banco em uma preferência válida.
    // O cliente mantém o tema atual e tenta sincronizar novamente depois.
    return json({ error: 'Não foi possível consultar a preferência de aparência.' }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Dados inválidos.' }, 400); }

  const theme = String(body?.theme || '').trim();
  if (!ALLOWED_THEMES.has(theme)) {
    return json({ error: 'Aparência inválida. Use auto, light, dark ou contrast.' }, 400);
  }

  try {
    await env.DB.prepare('UPDATE users SET theme = ? WHERE id = ?').bind(theme, user.id).run();
  } catch {
    return json({ error: 'A configuração de aparência ainda não está disponível no banco do Portal. Atualize o Portal para a versão compatível.' }, 503);
  }

  return json({ ok: true, theme });
}
