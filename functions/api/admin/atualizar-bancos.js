// POST /api/admin/atualizar-bancos
// Atualização não destrutiva dos dois D1 já vinculados ao projeto.

import { json, logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import { ensureRegulacaoSchema } from '../_db.js';
import { ensurePortalSchema } from './_portal-db.js';

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  try {
    const portal = await ensurePortalSchema(env);
    const regulacao = await ensureRegulacaoSchema(env);
    await logAudit(env, user, 'update', 'emulti_databases', 'portal+regulacao', {
      portal_ok: portal.schemaOk,
      regulacao_ok: regulacao.schemaOk,
      portal_tabelas_faltantes: portal.tabelasFaltantes,
      regulacao_tabelas_faltantes: regulacao.tabelasFaltantes,
    });
    return json({
      ok: !!portal.schemaOk && !!regulacao.schemaOk,
      mensagem: portal.schemaOk && regulacao.schemaOk
        ? 'Os dois bancos D1 foram verificados e atualizados sem apagar dados.'
        : 'A atualização foi executada, mas ainda existem pendências.',
      portal,
      regulacao,
    });
  } catch (err) {
    return json({
      error: 'Não foi possível concluir a atualização dos bancos D1.',
      detalhe: String(err?.message || err || ''),
    }, 503);
  }
}
