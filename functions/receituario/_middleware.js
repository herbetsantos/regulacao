// Protege TODA a rota /receituario/* no backend (Cloudflare Pages Function
// executada antes de servir o arquivo estático receituario/index.html).
//
// Regras:
//  - Usuário precisa estar autenticado (cookie de sessão válido), senão
//    é redirecionado para /login.html?next=...
//  - Usuário precisa ter a funcionalidade "receituario" liberada.
//  - Usuário precisa ter ao menos uma unidade liberada (admin: todas as
//    unidades ativas automaticamente).
//
// A própria lista de unidades que aparece no seletor (e o filtro de qual
// unidade cada usuário pode escolher) é resolvida no cliente, chamando
// GET /api/unidades/minhas — que aplica exatamente a mesma checagem de
// permissão feita aqui. Isso elimina a necessidade de reescrever o HTML
// estático a cada novo cadastro de unidade.

import { getAuthUser } from '../api/_utils.js';
import { getUnidadesPermitidas } from '../api/_unidades.js';
import { getUserPermissions } from '../api/_permissions.js';

export async function onRequest(context) {
  return protectAndServe(context);
}

async function protectAndServe({ request, env, next }) {
  const url = new URL(request.url);

  const user = await getAuthUser(request, env);
  if (!user) {
    const nextParam = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(`${url.origin}/login.html?next=${nextParam}`, 302);
  }

  const permissions = await getUserPermissions(env, user);
  if (!permissions.receituario) {
    return Response.redirect(
      `${url.origin}/portal.html?erro=${encodeURIComponent('Você não tem acesso à ferramenta de Receituário. Fale com o administrador do portal.')}`,
      302
    );
  }

  const permitidas = await getUnidadesPermitidas(env, user);
  if (permitidas.length === 0) {
    return Response.redirect(
      `${url.origin}/portal.html?erro=${encodeURIComponent('Você ainda não tem nenhuma unidade liberada para o Receituário. Fale com o administrador do portal.')}`,
      302
    );
  }

  return next();
}
