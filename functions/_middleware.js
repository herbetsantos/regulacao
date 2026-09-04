// Guarda de acesso para as páginas estáticas de ferramentas/menus, baseada nas
// permissões por funcionalidade (ver functions/api/_permissions.js).
//
// Cloudflare Pages executa este arquivo para TODA requisição do site (é o
// _middleware.js da raiz), por isso o primeiro passo é sempre checar se o
// caminho está no mapa abaixo — se não estiver, devolve next() imediatamente
// e não custa nada extra (nenhuma chamada ao banco, nenhum atraso).
//
// /receituario/* já tem seu próprio middleware específico (com regra própria
// de unidades) e não entra no mapa aqui, pra não rodar a checagem duas vezes.

import { getAuthUser } from './api/_utils.js';
import { getUserPermissions } from './api/_permissions.js';

// pathname (sem barra final, com ou sem .html) -> feature_key exigida
const PROTECTED = {
  '/guiasmalotes': 'malotes',
  '/guiasmalotes.html': 'malotes',
  '/facilitawhats': 'facilitawhats',
  '/facilitawhats.html': 'facilitawhats',
  '/documentos': 'documentos',
  '/documentos.html': 'documentos',
  '/manuais': 'manuais',
  '/manuais.html': 'manuais',
  '/relatorios': 'relatorios',
  '/relatorios.html': 'relatorios',
  '/admin': 'administracao',
  '/admin.html': 'administracao',
};

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const featureKey = PROTECTED[pathname];

  if (!featureKey) return next();

  const user = await getAuthUser(request, env);
  if (!user) {
    const nextParam = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(`${url.origin}/login.html?next=${nextParam}`, 302);
  }

  const permissions = await getUserPermissions(env, user);
  if (!permissions[featureKey]) {
    return Response.redirect(
      `${url.origin}/portal.html?erro=${encodeURIComponent('Você não tem acesso a essa ferramenta. Fale com o administrador do portal.')}`,
      302
    );
  }

  return next();
}
