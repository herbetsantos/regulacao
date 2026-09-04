import { json } from '../_utils.js';
import { listUnidades } from '../_unidades.js';

// GET: lista os NOMES das unidades ATIVAS, sem exigir login. Usado só pelo
// formulário público /solicitar-acesso.html, para que a pessoa escolha a
// mesma lista de unidades que o Super Administrador cadastra em
// Administração > Unidades — em vez de digitar o nome livremente (o que
// gera variações/erros de digitação e dificulta a aprovação da solicitação).
//
// Devolve só `nome` (nada de CNES/endereço/telefone/code): é a mesma
// informação que já aparece publicamente em várias fachadas de UBS, então
// não há problema de privacidade em expor sem autenticação.
export async function onRequestGet({ env }) {
  const unidades = await listUnidades(env, { onlyActive: true });
  const nomes = unidades.map((u) => u.nome);
  return json({ unidades: nomes });
}
