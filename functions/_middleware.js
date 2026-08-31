// Guarda de acesso para TODAS as páginas deste projeto. Roda antes de
// qualquer HTML ser servido.
//
// Duas situações:
//  1) A URL tem "?handoff=TOKEN" (o usuário acabou de vir do Portal,
//     clicando num link ou terminando o login lá) — consome o código,
//     cria uma sessão própria aqui, e redireciona pra mesma URL sem o
//     parâmetro, já com o cookie de sessão setado.
//  2) Não tem handoff — confere o cookie de sessão local normalmente. Se
//     não tiver (ou tiver expirado), manda pro login do Portal.
//
// Troque PORTAL_URL pelo domínio real do portal antes do deploy.

import { getAuthUser, consumeHandoffToken, createSession, sessionCookieHeader, json } from './api/_utils.js';
import { getUserPermissions } from './api/_permissions.js';

const PORTAL_URL = 'https://apoioapscajamar.pages.dev';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  const handoffToken = url.searchParams.get('handoff');
  if (handoffToken) {
    const userId = await consumeHandoffToken(env, handoffToken);
    if (!userId) {
      // Código inválido/expirado/já usado — manda pro login do portal,
      // sem tentar seguir com a URL como se nada tivesse acontecido.
      return Response.redirect(`${PORTAL_URL}/login.html`, 302);
    }
    const sessionToken = await createSession(env, userId);
    url.searchParams.delete('handoff');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': url.toString(),
        'Set-Cookie': sessionCookieHeader(sessionToken),
      },
    });
  }

  // Requisições de API tratam a própria autenticação (requireRegulacaoAccess
  // em cada endpoint) e devolvem JSON de erro, não redirect — deixa passar
  // direto pro handler.
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  const user = await getAuthUser(request, env);
  if (!user) {
    const next = encodeURIComponent(url.toString());
    return Response.redirect(`${PORTAL_URL}/login.html?next=${next}`, 302);
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    const permissions = await getUserPermissions(env, user);
    if (!permissions.regulacao_vagas) {
      return Response.redirect(
        `${PORTAL_URL}/portal.html?erro=${encodeURIComponent('Você não tem acesso à Regulação de Vagas. Fale com o administrador do portal.')}`,
        302
      );
    }
  }

  return next();
}
