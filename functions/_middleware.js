// Guarda de acesso das páginas do eMulti.
// O Portal entrega a identidade por handoff; a autorização funcional é
// própria da Regulação e independe do role do usuário no Portal.

import { getAuthUser, consumeHandoffToken, createSession, sessionCookieHeader } from './api/_utils.js';
import { getRegulacaoAccessProfile } from './api/_permissions.js';

const PORTAL_URL = 'https://apoioapscajamar.pages.dev';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  const handoffToken = url.searchParams.get('handoff');
  if (handoffToken) {
    const userId = await consumeHandoffToken(env, handoffToken);
    if (!userId) return Response.redirect(`${PORTAL_URL}/login.html`, 302);

    const sessionToken = await createSession(env, userId);
    url.searchParams.delete('handoff');
    try {
      const row = await env.DB.prepare('SELECT theme FROM users WHERE id = ?').bind(userId).first();
      if (['auto', 'light', 'dark', 'contrast'].includes(row?.theme)) url.searchParams.set('theme', row.theme);
    } catch { /* tema é opcional */ }

    return new Response(null, {
      status: 302,
      headers: { 'Location': url.toString(), 'Set-Cookie': sessionCookieHeader(sessionToken) },
    });
  }

  if (url.pathname.startsWith('/api/')) return next();

  const user = await getAuthUser(request, env);
  if (!user) {
    const nextUrl = encodeURIComponent(url.toString());
    return Response.redirect(`${PORTAL_URL}/login.html?next=${nextUrl}`, 302);
  }

  try {
    const access = await getRegulacaoAccessProfile(env, user);
    if (!access.acesso) {
      return Response.redirect(
        `${PORTAL_URL}/portal.html?erro=${encodeURIComponent('Seu usuário não possui responsabilidade nem vínculo ativo com equipe/unidade no eMulti / Regulação de Vagas.')}`,
        302
      );
    }
  } catch {
    return Response.redirect(
      `${PORTAL_URL}/portal.html?erro=${encodeURIComponent('Não foi possível validar os acessos do eMulti. Verifique a migração de permissões da Regulação.')}`,
      302
    );
  }

  return next();
}
