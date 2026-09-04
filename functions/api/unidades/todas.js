import { json, requireAuth } from '../_utils.js';
import { listUnidades } from '../_unidades.js';

// GET: todas as unidades ATIVAS, para QUALQUER usuário autenticado — sem
// filtrar por atribuição (user_unidades). Diferente de /api/unidades/minhas
// (que só devolve as unidades atribuídas ao usuário, pensado para o
// Receituário — "de onde esse profissional pode emitir receita"), este
// endpoint serve a Guias e Malotes: aqui qualquer usuário precisa poder
// selecionar qualquer unidade como DESTINO de uma guia ou remessa, não
// apenas a(s) unidade(s) em que ele mesmo atua.
export async function onRequestGet({ request, env }) {
  const { error } = await requireAuth(request, env);
  if (error) return error;

  const unidades = await listUnidades(env, { onlyActive: true });
  // Mantém só os campos usados pelo seletor (nome para busca/exibição,
  // code como chave estável) — sem CNES/endereço/telefone, que não são
  // necessários aqui e pertencem ao domínio do Receituário.
  const enxutas = unidades.map((u) => ({ code: u.code, nome: u.nome }));
  return json({ unidades: enxutas });
}
