import { json, requireAuth } from '../_utils.js';
import { getUnidadesPermitidasCompletas } from '../_unidades.js';

// GET: unidades que o usuário autenticado pode selecionar ao emitir uma
// receita (com nome/CNES/endereço/telefone, usados para montar o documento).
// Usado por receituario/index.html — é a checagem que realmente decide quais
// unidades aparecem no seletor (a página estática em si não tem essa lógica).
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireAuth(request, env);
  if (error) return error;

  const unidades = await getUnidadesPermitidasCompletas(env, user);
  return json({ unidades });
}
