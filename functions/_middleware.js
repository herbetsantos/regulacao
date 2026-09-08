// Guarda de acesso das páginas do eMulti / Regulação de Vagas.
// v2.19.0 — correção do loop de redirecionamento em Cloudflare Pages.
//
// O Pages usa URLs "limpas": /login.html pode ser normalizado para /login.
// Por isso a guarda deve reconhecer as duas formas e preferir a URL canônica
// sem ".html" nos redirects internos.

import {
  getAuthUser,
  consumeHandoffToken,
  createSession,
  sessionCookieHeader,
} from './api/_utils.js';

import { getRegulacaoAccessProfile } from './api/_permissions.js';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  // Normaliza apenas para COMPARAÇÃO:
  // /login.html -> /login
  // /minha-conta.html -> /minha-conta
  // /painel.html -> /painel
  const pagePath = url.pathname.endsWith('.html')
    ? url.pathname.slice(0, -5)
    : url.pathname;

  const localUrl = (path) => new URL(path, url.origin).toString();

  const handoffToken = url.searchParams.get('handoff');

  if (handoffToken) {
    const userId = await consumeHandoffToken(env, handoffToken);

    if (!userId) {
      return Response.redirect(
        localUrl(`/login?next=${encodeURIComponent(pagePath || '/')}`),
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

  // APIs fazem sua própria validação de autenticação/permissão.
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Recursos públicos necessários para a tela de login.
  // IMPORTANTE: Cloudflare Pages pode servir login.html como /login.
  if (
    pagePath === '/login' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/')
  ) {
    return next();
  }

  const user = await getAuthUser(request, env);

  if (!user) {
    const nextPath = `${pagePath || '/'}${url.search}`;

    return Response.redirect(
      localUrl(`/login?next=${encodeURIComponent(nextPath)}`),
      302
    );
  }

  // Evita loop quando o Pages normaliza /minha-conta.html para /minha-conta.
  if (
    user.source === 'local' &&
    user.mustChangePassword &&
    pagePath !== '/minha-conta'
  ) {
    return Response.redirect(
      localUrl('/minha-conta?obrigatoria=1'),
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
