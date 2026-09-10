// Guarda de acesso — eMulti / Regulação 2.26.0
// Portal APS autentica; a sessão do módulo é própria do regulacao-vagas-db.

import { getAuthUser, consumeHandoffToken, createSession, sessionCookieHeader } from './api/_utils.js';
import { getRegulacaoAccessProfile } from './api/_permissions.js';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const pagePath = url.pathname.endsWith('.html') ? url.pathname.slice(0, -5) : url.pathname;
  const localUrl = (path) => new URL(path, url.origin).toString();

  const handoffToken = url.searchParams.get('handoff');
  if (handoffToken) {
    const identity = await consumeHandoffToken(env, handoffToken);
    if (!identity) return Response.redirect(localUrl(`/login?next=${encodeURIComponent(pagePath || '/')}`),302);
    const sessionToken = await createSession(env, identity);
    url.searchParams.delete('handoff');
    return new Response(null,{status:302,headers:{Location:url.toString(),'Set-Cookie':sessionCookieHeader(sessionToken)}});
  }

  if (url.pathname.startsWith('/api/')) return next();
  if (pagePath === '/login' || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) return next();

  const user = await getAuthUser(request, env);
  if (!user) {
    const nextPath = `${pagePath || '/'}${url.search}`;
    return Response.redirect(localUrl(`/login?next=${encodeURIComponent(nextPath)}`),302);
  }

  try {
    const access = await getRegulacaoAccessProfile(env, user);
    if (!access.acesso) return new Response('Seu usuário está autenticado, mas ainda não possui acesso ativo ao eMulti / Regulação.',{status:403,headers:{'content-type':'text/plain; charset=utf-8'}});
  } catch (err) {
    console.error('Falha ao validar acessos da Regulação:',err);
    return new Response('Não foi possível validar os acessos da Regulação.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
  }
  return next();
}
