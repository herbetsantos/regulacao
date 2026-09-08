// Guarda de acesso das páginas do eMulti / Regulação de Vagas.
// v2.19.0 — correção de redirects no runtime do Cloudflare.
// Response.redirect() deve receber uma URL absoluta.

import {
  getAuthUser,
  consumeHandoffToken,
  createSession,
  sessionCookieHeader,
} from './api/_utils.js';

import { getRegulacaoAccessProfile } from './api/_permissions.js';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  // Gera URL absoluta no próprio eMulti.
  const localUrl = (path) => new URL(path, url.origin).toString();

  const handoffToken = url.searchParams.get('handoff');

  if (handoffToken) {
    const userId = await consumeHandoffToken(env, handoffToken);

    if (!userId) {
      return Response.redirect(
        localUrl(`/login.html?next=${encodeURIComponent(url.pathname)}`),
        302
      );
    }

    const sessionToken = await createSession(env, userId);

    url.searchParams.delete('handoff');

    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
        'Set-Cookie': sessionCookieHeader(sessionToken),
      },
    });
  }

  // APIs possuem sua própria validação de autenticação/permissão.
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Recursos públicos necessários para a tela de login.
  if (
    url.pathname === '/login.html' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/')
  ) {
    return next();
  }

  const user = await getAuthUser(request, env);

  if (!user) {
    const nextPath = `${url.pathname}${url.search}`;

    return Response.redirect(
      localUrl(`/login.html?next=${encodeURIComponent(nextPath)}`),
      302
    );
  }

  if (
    user.source === 'local' &&
    user.mustChangePassword &&
    url.pathname !== '/minha-conta.html'
  ) {
    return Response.redirect(
      localUrl('/minha-conta.html?obrigatoria=1'),
      302
    );
  }

  try {
    const access = await getRegulacaoAccessProfile(env, user);

    if (!access.acesso) {
      return new Response(
        'Seu usuário não possui acesso ativo ao eMulti / Regulação.',
        {
          status: 403,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
        }
      );
    }
  } catch (err) {
    console.error('Falha ao validar acessos da Regulação:', err);

    return new Response(
      'Não foi possível validar os acessos da Regulação.',
      {
        status: 503,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      }
    );
  }

  return next();
}
