import { json, getCookie } from './_utils.js';

export async function onRequestPost({ request, env }) {
  const token = getCookie(request, 'session');
  if (token) {
    try {
      const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ?').bind(token).first();
      if (row?.user_id) {
        // Encerra também a sessão do Portal: os dois projetos usam a mesma
        // tabela sessions, embora cada domínio tenha seu próprio cookie.
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id).run();
      } else {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      }
    } catch { /* limpeza best-effort */ }
  }
  return json({ ok: true }, 200, {
    'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  });
}
